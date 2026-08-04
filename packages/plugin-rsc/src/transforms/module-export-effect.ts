import { tinyassert } from '@hiogawa/utils'
import type { Identifier } from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { scanModuleExports, type ModuleExportMeta } from './module-export-scan'
import { rejectNonAsyncFunction, validateNonAsyncFunction } from './utils'

// TODO: Metadata, filtering, and returned reference contexts are currently
// ported only for transformWrapExport compatibility. Remove them if no
// module-export-effect consumer needs this API surface.
export type TransformModuleExportEffectFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformModuleExportEffectContext = {
  binding: string
  exportName: string
  meta: ModuleExportMeta
}

export type TransformModuleExportEffectOptions = {
  generate: (context: TransformModuleExportEffectContext) => string
  filter?: TransformModuleExportEffectFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

export type TransformModuleExportEffectResult = {
  output: MagicString
  references: TransformModuleExportEffectContext[]
  referenceNames: string[]
}

/**
 * Preserves source bindings and emits registration effects at module end.
 *
 * Conceptually:
 *
 * ```js
 * export async function action() {}
 * export default async () => {}
 * ```
 *
 * becomes:
 *
 * ```js
 * async function action() {}
 * const $$effect_default = async () => {}
 *
 * __GENERATE__(action, 'action')
 * export { action }
 * __GENERATE__($$effect_default, 'default')
 * export default $$effect_default
 * ```
 *
 * Here, `__GENERATE__(...)` represents the expression returned by the
 * `generate` callback for each `{ binding, exportName, meta }` context.
 * `references` returns those contexts in generation order, while
 * `referenceNames` returns only their export names.
 *
 * Effects emitted through declaration and default-export rewrites remain mapped
 * to their original export sites. Export-specifier effects are appended without
 * explicit mappings and rely on adjacent-source fallback. React captures the
 * `registerServerReference` caller as the reference source location.
 *
 * Generated bindings such as `$$effect_default` and `$$effect_import_*` are not
 * deconflicted from user bindings, consistent with the other transform helpers.
 */
export function transformModuleExportEffect(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportEffectOptions,
): TransformModuleExportEffectResult {
  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportEffectContext[] = []

  function generate(context: TransformModuleExportEffectContext): string {
    references.push(context)
    return `${options.generate(context)};`
  }

  // Rewrite and move an existing source range so the generated effect borrows
  // its original mapping at module end. For example:
  //
  // input:
  //   export async function f() {}
  //   ^^^^^^
  // output:
  //   async function f() {}
  //   registerServerReference(f, ...); // maps to the original `export` token
  //   export { f };
  function replaceAndMove(
    start: number,
    end: number,
    destination: number,
    code: string,
  ): void {
    output.update(start, end, `\n${code}\n`)
    if (end !== destination) {
      output.move(start, end, destination)
    }
  }

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      const { localName: binding, exportName, meta } = group.export
      if (!filter(exportName, meta)) continue
      validateNonAsyncFunction(options, group.declaration)
      replaceAndMove(
        group.node.start,
        group.declaration.start,
        input.length,
        `${generate({ binding, exportName, meta })}\nexport { ${binding} };`,
      )
    } else if (group.type === 'variable-declaration') {
      const exportNames: string[] = []
      const effects: string[] = []
      for (const declarator of group.declarators) {
        let validate = false
        for (const entry of declarator.exports) {
          const { localName: binding, exportName, meta } = entry
          exportNames.push(exportName)
          if (filter(exportName, meta)) {
            validate = true
            effects.push(generate({ binding, exportName, meta }))
          }
        }
        if (validate) {
          const init = declarator.node.init
          if (init) {
            validateNonAsyncFunction(options, init)
          } else {
            rejectNonAsyncFunction(options, declarator.node.start)
          }
        }
      }
      if (effects.length > 0) {
        replaceAndMove(
          group.node.start,
          group.declaration.start,
          input.length,
          `${effects.join('\n')}\nexport { ${exportNames.join(', ')} };`,
        )
      }
    } else if (group.type === 'specifiers') {
      for (const entry of group.exports) {
        tinyassert(entry.node.local.type === 'Identifier')
        if (entry.node.exported.type !== 'Identifier') {
          throw Object.assign(
            new Error('unsupported string literal export name'),
            { pos: entry.node.exported.start },
          )
        }
        const { exportName, meta } = entry
        if (!filter(exportName, meta)) continue

        let binding = entry.localName
        if (group.node.source) {
          binding = `$$effect_import_${exportName}`
          // TODO: Preserve import attributes from the original re-export.
          output.append(
            `\nimport { ${entry.localName} as ${binding} } from ${group.node.source.raw};`,
          )
        }
        output.append(`\n${generate({ binding, exportName, meta })}`)
      }
    } else if (group.type === 'export-all') {
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: group.node.start,
        })
      }
    } else if (group.type === 'default') {
      const node = group.node
      const binding = group.localName ?? '$$effect_default'
      const meta = group.meta
      if (!filter('default', meta)) continue
      validateNonAsyncFunction(options, node.declaration)
      const effect = generate({ binding, exportName: 'default', meta })

      if (group.kind === 'identifier') {
        const declaration = node.declaration as Identifier
        // export default foo
        //        ^^^^^^^^^^^
        // ⬇️ (replace `default foo`)
        // export const $$effect_default = foo
        //        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        const exportTokenEnd = node.start + 'export'.length
        output.update(
          exportTokenEnd,
          node.end,
          `const ${binding} = ${declaration.name};`,
        )
        // export const $$effect_default = foo
        // ^^^^^^
        // ⬇️ (replace `export`)
        // const $$effect_default = foo;
        // registerServerReference($$effect_default, 'default'); // << effect
        // export default $$effect_default;                      // << export
        replaceAndMove(
          node.start,
          exportTokenEnd,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      } else if (group.kind === 'named-declaration') {
        // export default function foo() {}
        // ^^^^^^^^^^^^^^
        // ⬇️
        // function foo() {}
        // registerServerReference(foo, 'default'); // << effect
        // export default foo;                      // << export
        replaceAndMove(
          node.start,
          node.declaration.start,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      } else {
        // export default () => { ... }
        //        ^^^^^^^
        // ⬇️ (replace `default`)
        // export const $$effect_default = () => { ... };
        //        ^^^^^^^^^^^^^^^^^^^^^^^^^
        const exportTokenEnd = node.start + 'export'.length
        output.update(
          exportTokenEnd,
          node.declaration.start,
          `const ${binding} = `,
        )
        // export const $$effect_default = () => { ... };
        // ^^^^^^
        // ⬇️ (replace `export`)
        // const $$effect_default = () => { ... };
        // registerServerReference($$effect_default, 'default'); // << effect
        // export default $$effect_default;                      // << export
        replaceAndMove(
          node.start,
          exportTokenEnd,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      }
    }
  }

  return {
    output,
    references,
    referenceNames: references.map((reference) => reference.exportName),
  }
}
