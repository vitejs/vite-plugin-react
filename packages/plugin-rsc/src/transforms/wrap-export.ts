import { tinyassert } from '@hiogawa/utils'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import {
  scanModuleExports,
  type ModuleExportEntry,
  type ModuleExportMeta,
} from './module-export-scan'
import { rejectNonAsyncFunction, validateNonAsyncFunction } from './utils'

export type TransformWrapExportFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformWrapExportOptions = {
  runtime: (value: string, name: string, meta: ModuleExportMeta) => string
  ignoreExportAllDeclaration?: boolean
  rejectNonAsyncFunction?: boolean
  filter?: TransformWrapExportFilter
}

export type TransformWrapExportResult = {
  exportNames: string[]
  output: MagicString
}

/**
 * Replaces selected module-local export bindings with runtime wrappers.
 *
 * Conceptually:
 *
 * ```js
 * export async function action() {}
 * export const loader = async () => {}
 * export default function Page() {}
 * ```
 *
 * becomes:
 *
 * ```js
 * async function action() {}
 * let loader = async () => {}
 * function Page() {}
 *
 * action = __WRAP__(action, 'action')
 * export { action }
 * loader = __WRAP__(loader, 'loader')
 * export { loader }
 * const $$wrap_Page = __WRAP__(Page, 'default')
 * export { $$wrap_Page as default }
 * ```
 *
 * Here, `__WRAP__(...)` represents the expression returned by `runtime`.
 * Unlike `transformModuleExportWrap`, direct local references observe the
 * wrapped value because the original binding itself is reassigned.
 *
 * Declaration rewrites are moved to the end of the module so each generated
 * runtime call retains the original export token's source mapping. Wrappers for
 * export specifiers and default exports are appended without explicit mappings.
 *
 * Generated `$$wrap_*` and `$$import_*` names are not deconflicted from user
 * bindings, consistent with the other transform helpers.
 */
export function transformWrapExport(
  input: string,
  viteAst: ESTree.Program,
  options: TransformWrapExportOptions,
): TransformWrapExportResult {
  const output = new MagicString(input)
  const exportNames: string[] = []
  const appendedCode: string[] = []
  const filter = options.filter ?? (() => true)

  /**
   * Strips a direct export declaration and emits assignments and exports at
   * module end. All bindings are re-exported, but only selected bindings are
   * assigned runtime wrappers.
   *
   * The rewritten source range is moved so generated runtime calls borrow the
   * original export site's mapping:
   *
   * ```js
   * // input
   * export async function action() {}
   * ^^^^^^
   *
   * // output
   * async function action() {}
   * action = __WRAP__(action, 'action')  << maps to the `export` token
   * export { action }                    <<
   * ```
   */
  function emitWrappedAssignments(
    // start/end represents original `export` token range
    start: number,
    end: number,
    exports: ModuleExportEntry[],
    selectedExportNames: Set<string>,
  ) {
    exportNames.push(...selectedExportNames)
    const newCode =
      exports
        .map(
          (e) =>
            selectedExportNames.has(e.exportName) &&
            `${e.localName} = /* #__PURE__ */ ${options.runtime(
              e.localName,
              e.exportName,
              e.meta,
            )};\n`,
        )
        .filter(Boolean)
        .join('') +
      `export { ${exports.map((e) => e.localName).join(', ')} };\n`
    output.update(start, end, newCode)
    output.move(start, end, input.length)
  }

  /**
   * Emits a separate wrapper binding for exports that cannot reassign an
   * existing direct declaration, such as export specifiers and defaults.
   *
   * ```js
   * // existing source binding remains unchanged
   * const local = init()
   * export { local as renamed }  // caller removes the original export
   *
   * // appended code
   * const $$wrap_local = __WRAP__(local, 'renamed')
   * export { $$wrap_local as renamed }
   * ```
   */
  function emitWrappedBinding(
    name: string,
    exportName: string,
    meta: ModuleExportMeta = {},
  ) {
    exportNames.push(exportName)
    appendedCode.push(
      `const $$wrap_${name} = /* #__PURE__ */ ${options.runtime(
        name,
        exportName,
        meta,
      )}`,
      `export { $$wrap_${name} as ${exportName} }`,
    )
  }

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      // export function f() {}
      // ⬇️
      // function f() {}        << strip export
      // f = __WRAP__(f, 'f')   << emit
      // export { f }           << emit
      const entry = group.export
      if (!filter(entry.exportName, entry.meta)) continue
      validateNonAsyncFunction(options, group.declaration)
      emitWrappedAssignments(
        group.node.start,
        group.declaration.start,
        [entry],
        new Set([entry.exportName]),
      )
    } else if (group.type === 'variable-declaration') {
      // export const selected = init(), skipped = init()
      // ⬇️
      // let selected = init(), skipped = init()    << strip export
      // selected = __WRAP__(selected, 'selected')  << emit
      // export { selected, skipped }               << emit
      const exports = group.declarators.flatMap((item) => item.exports)
      const selectedExportNames = new Set(
        exports
          .filter((entry) => filter(entry.exportName, entry.meta))
          .map((entry) => entry.exportName),
      )
      if (selectedExportNames.size === 0) continue

      // change `const` to `let` to reassign local name
      if (group.declaration.kind === 'const') {
        output.update(
          group.declaration.start,
          group.declaration.start + 5,
          'let',
        )
      }
      for (const declarator of group.declarators) {
        if (
          declarator.exports.some(({ exportName }) =>
            selectedExportNames.has(exportName),
          )
        ) {
          if (declarator.node.init) {
            validateNonAsyncFunction(options, declarator.node.init)
          } else {
            rejectNonAsyncFunction(options, declarator.node.start)
          }
        }
      }
      emitWrappedAssignments(
        group.node.start,
        group.declaration.start,
        exports,
        selectedExportNames,
      )
    } else if (group.type === 'specifiers') {
      // export { selected as renamed, skipped }
      // ⬇️
      // const $$wrap_selected = __WRAP__(selected, 'renamed')
      // export { $$wrap_selected as renamed, skipped }
      const skippedExports: string[] = []
      let selected = false
      for (const entry of group.exports) {
        tinyassert(entry.node.local.type === 'Identifier')
        if (entry.node.exported.type !== 'Identifier') {
          throw Object.assign(
            new Error('unsupported string literal export name'),
            { pos: entry.node.exported.start },
          )
        }
        if (!filter(entry.exportName, entry.meta)) {
          skippedExports.push(
            entry.localName === entry.exportName
              ? entry.localName
              : `${entry.localName} as ${entry.exportName}`,
          )
          continue
        }
        selected = true

        let binding = entry.localName
        const source = group.node.source
        if (source) {
          // introduce local variable via renamed import
          // export { remote as action } from './dep'
          // ⬇️
          // import { remote as $$import_remote } from './dep'
          binding = `$$import_${entry.localName}`
          appendedCode.push(
            // TODO: Preserve import attributes from the original re-export.
            `import { ${entry.localName} as ${binding} } from ${source.raw}`,
          )
        }
        emitWrappedBinding(binding, entry.exportName, entry.meta)
      }
      if (selected) {
        output.remove(group.node.start, group.node.end)
        if (skippedExports.length > 0) {
          const source = group.node.source
            ? ` from ${group.node.source.raw}`
            : ''
          appendedCode.push(`export { ${skippedExports.join(', ')} }${source}`)
        }
      }
    } else if (group.type === 'export-all') {
      // Vue SFC uses ExportAllDeclaration to re-export its setup script, so
      // consumers can opt out of rejecting this form.
      // https://github.com/vitejs/vite-plugin-vue/blob/30a97c1ddbdfb0e23b7dc14a1d2fb609668b9987/packages/plugin-vue/src/main.ts#L372
      if (!options.ignoreExportAllDeclaration) {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: group.node.start,
        })
      }
    } else if (group.type === 'default') {
      const meta = group.meta
      if (!filter('default', meta)) continue

      const localName = group.localName ?? '$$default'
      if (group.kind === 'named-declaration') {
        // export default function Page() {}
        // ⬇️
        // function Page() {}
        output.remove(group.node.start, group.node.declaration.start)
      } else {
        // export default expression
        // ⬇️
        // const $$default = expression
        output.update(
          group.node.start,
          group.node.declaration.start,
          'const $$default = ',
        )
      }
      validateNonAsyncFunction(options, group.node.declaration)
      emitWrappedBinding(localName, 'default', meta)
    }
  }

  // Emit wrapper bindings, reconstructed skipped exports, and imports for
  // selected forwarded exports in their discovery order.
  if (appendedCode.length > 0) {
    output.append(['', ...appendedCode, ''].join(';\n'))
  }

  return { exportNames, output }
}
