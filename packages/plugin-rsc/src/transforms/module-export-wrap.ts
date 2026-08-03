import { tinyassert } from '@hiogawa/utils'
import type { Program } from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import {
  scanModuleExports,
  type ModuleExportDirectFunction,
  type ModuleExportMeta,
} from './module-export-scan'
import { getDirectivePrologueEnd, validateNonAsyncFunction } from './utils'

export type TransformModuleExportWrapContext = {
  /** The local expression that evaluates to the exported implementation. */
  implementation: string
  /**
   * The function's runtime name before rewriting a direct function export.
   * When present, the generated expression is responsible for restoring it.
   *
   * - `"action"` for `export const action = () => {}`
   * - `"implementation"` for `export const action = function implementation() {}`
   * - `"default"` for `export default () => {}`
   * - `undefined` for an indirect export such as `export { action }`
   */
  originalName?: string
  /** The public export name, or `"default"` for a default export. */
  exportName: string
  /** Static metadata collected from the original export declaration. */
  meta: ModuleExportMeta
}

export type TransformModuleExportWrapFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformModuleExportWrapOptions = {
  generate: (context: TransformModuleExportWrapContext) => string
  filter?: TransformModuleExportWrapFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

export type TransformModuleExportWrapResult = {
  output: MagicString
  references: TransformModuleExportWrapContext[]
  referenceNames: string[]
}

/**
 * Replaces selected module exports with canonical runtime wrapper bindings.
 *
 * Conceptually:
 *
 * ```js
 * 'use server'
 *
 * export async function someFn(value) {
 *   return value
 * }
 *
 * export const someValue = createSomeValue()
 * ```
 *
 * becomes:
 *
 * ```js
 * 'use server'
 *
 * const $$module_0_implementation_someFn = async function $$module_0_implementation_someFn(value) {
 *   return value
 * }
 * export const someFn = __WRAP__(
 *   Object.defineProperty($$module_0_implementation_someFn, 'name', {
 *     value: 'someFn',
 *   }),
 *   'someFn',
 * )
 *
 * const someValue = createSomeValue()
 * const $$module_1_binding_someValue = __WRAP__(someValue, 'someValue')
 * export { $$module_1_binding_someValue as someValue }
 * ```
 *
 * Here, `__WRAP__(...)` represents the expression returned by the `generate`
 * callback for each `{ implementation, originalName, exportName, meta }`
 * context. `originalName` is present for directly exported functions whose
 * source name must be restored by the generated expression.
 * `references` returns those contexts in wrapper creation order, while
 * `referenceNames` returns only their export names.
 *
 * Direct function implementations move after leading directives and before
 * their wrappers. This avoids initialization-order issues and makes recursive
 * references resolve through the exported wrapper. Other values retain their
 * source initialization and receive a separate canonical binding at the export
 * boundary.
 *
 * Generated `$$module_*` names are not deconflicted from user bindings,
 * consistent with the other transform helpers.
 */
export function transformModuleExportWrap(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportWrapOptions,
): TransformModuleExportWrapResult {
  const ast = viteAst as unknown as Program

  // Keep a boundary outside the parsed AST so moving an export at EOF does not
  // also move code inserted at the export's end.
  if (!input.endsWith('\n')) {
    input += '\n'
  }

  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportWrapContext[] = []
  const wrappedBindingCode: string[] = []
  const hoistPosition = getDirectivePrologueEnd(ast)

  function createContext(
    implementation: string,
    exportName: string,
    meta: ModuleExportMeta,
    originalName?: string,
  ): TransformModuleExportWrapContext {
    const context = {
      implementation,
      originalName,
      exportName,
      meta,
    }
    references.push(context)
    return context
  }

  // TODO: should we move PURE annotation to user side responsibility?
  function generate(context: TransformModuleExportWrapContext): string {
    return `/* #__PURE__ */ ${options.generate(context)}`
  }

  function exportBinding(binding: string, exportName: string): string {
    return binding === exportName
      ? `export { ${binding} };`
      : `export { ${binding} as ${exportName} };`
  }

  // TODO: maybe too long?
  function createName(
    kind: 'implementation' | 'binding',
    name: string,
  ): string {
    return `$$module_${references.length}_${kind}_${name}`
  }

  /**
   * Wraps an export whose original local initialization must remain in place,
   * such as a class, an arbitrary expression, or an export specifier. The
   * generated wrapper is assigned to a separate binding and exported after the
   * source declarations, leaving the original local binding unchanged.
   *
   * For `emitWrappedBinding('value', 'value', meta)`:
   *
   * ```js
   * // Existing source initialization, left in place
   * export const value = init()
   *
   * // Code appended by emitWrappedBinding
   * const $$module_0_binding_value = __WRAP__(value, 'value')
   * export { $$module_0_binding_value as value }
   * ```
   *
   * @param implementation Local expression to pass to the generated wrapper.
   * @param exportName Public name for the generated export.
   * @param meta Static metadata collected from the original export.
   */
  function emitWrappedBinding(
    implementation: string,
    exportName: string,
    meta: ModuleExportMeta,
  ): void {
    const binding = createName('binding', exportName)
    const context = createContext(implementation, exportName, meta)
    wrappedBindingCode.push(
      `const ${binding} = ${generate(context)};`,
      exportBinding(binding, exportName),
    )
  }

  /**
   * Splits a directly exported function into a private implementation and a
   * generated wrapper expression. The implementation is moved after the
   * directive prologue, while the caller inserts the wrapper at the original
   * declaration site. The context includes the source-level function name so
   * the generated expression can restore it on the exported callable.
   *
   * For `hoistFunction({ node, originalName: 'action' }, 'action', 'action', meta)`:
   *
   * ```js
   * // Before
   * export async function action() {}
   *
   * // Moved into output by hoistFunction
   * const $$module_0_implementation_action =
   *   async function $$module_0_implementation_action() {}
   *
   * // Returned by hoistFunction
   * __WRAP__($$module_0_implementation_action, 'action')
   *
   * // Final declaration assembled by the caller
   * export const action = __WRAP__($$module_0_implementation_action, 'action')
   * ```
   *
   * @param directFunction Scanner metadata for the function to move.
   * @param sourceName Local declaration name used for the implementation binding.
   * @param exportName Public name for the generated export.
   * @param meta Static metadata collected from the original export.
   * @returns Generated wrapper expression for the original declaration site.
   */
  function hoistFunction(
    directFunction: ModuleExportDirectFunction,
    sourceName: string,
    exportName: string,
    meta: ModuleExportMeta,
  ): string {
    const { node, originalName } = directFunction
    validateNonAsyncFunction(options, node)
    const implementation = createName('implementation', sourceName)
    const originalPrefix =
      node.type === 'FunctionDeclaration' && node.id
        ? input.slice(node.start, node.id.start) +
          implementation +
          input.slice(node.id.end, node.body.start)
        : input.slice(node.start, node.body.start)
    output.update(
      node.start,
      node.body.start,
      `\nconst ${implementation} = ${originalPrefix}`,
    )
    output.appendLeft(node.end, ';\n')
    output.move(node.start, node.end, hoistPosition)

    const context = createContext(
      implementation,
      exportName,
      meta,
      originalName,
    )
    return generate(context)
  }

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      const [entry] = group.exports
      const { localName: name } = entry
      const meta = entry.meta
      if (!filter(entry.exportName, meta)) continue

      if (group.directFunction) {
        // export function f() {}
        // ⬇️ (hoist implementation and replace declaration)
        // const $$module_0_implementation_f = function ...
        // export const f = __WRAP__($$module_0_implementation_f, 'f')
        const replacement = hoistFunction(
          group.directFunction,
          name,
          entry.exportName,
          meta,
        )
        // strip `export`
        output.remove(group.node.start, group.declaration.start)
        output.appendLeft(
          group.declaration.start,
          `export const ${name} = ${replacement};`,
        )
      } else {
        // export class C {}
        // ⬇️ (keep initialization in place and append wrapped binding)
        // class C {}
        // const $$module_0_binding_C = __WRAP__(C, 'C')
        // export { $$module_0_binding_C as C }
        output.remove(group.node.start, group.declaration.start)
        emitWrappedBinding(name, entry.exportName, meta)
      }
    } else if (group.type === 'variable-declaration') {
      // export const action = async () => {}, value = init()
      // ⬇️
      // const $$module_0_implementation_action = async () => {}
      // const action = __WRAP__($$module_0_implementation_action, 'action'), value = init()
      // const $$module_1_binding_value = __WRAP__(value, 'value')
      // export { $$module_1_binding_value as value }
      // export { action }
      const wrappedBindingNames = new Set<string>()
      const exportNames = group.declarators.flatMap((item) =>
        item.exports.map((entry) => entry.exportName),
      )

      for (const declarator of group.declarators) {
        const directFunction = declarator.directFunction
        let validate = false

        for (const entry of declarator.exports) {
          const meta = entry.meta
          if (!filter(entry.exportName, meta)) continue
          validate = true

          if (directFunction) {
            // export const action = async () => {}
            // ⬇️
            // const $$module_0_implementation_action = async () => {}
            // const action = __WRAP__($$module_0_implementation_action, 'action')
            // export { action }
            const replacement = hoistFunction(
              directFunction,
              entry.localName,
              entry.exportName,
              meta,
            )
            output.appendLeft(directFunction.node.start, replacement)
          } else {
            // export const value = init()
            // ⬇️
            // const value = init()
            // const $$module_1_binding_value = __WRAP__(value, 'value')
            // export { $$module_1_binding_value as value }
            wrappedBindingNames.add(entry.exportName)
            emitWrappedBinding(entry.localName, entry.exportName, meta)
          }
        }

        if (validate && declarator.node.init && !directFunction) {
          validateNonAsyncFunction(options, declarator.node.init)
        }
      }

      if (wrappedBindingNames.size > 0) {
        // export const selected = init(), skipped = init()
        // ^^^^^^
        // ⬇️ (remove `export` and restore the unwrapped export separately)
        // const selected = init(), skipped = init()
        // export { skipped }
        output.remove(group.node.start, group.declaration.start)
        for (const name of exportNames) {
          if (!wrappedBindingNames.has(name)) {
            wrappedBindingCode.push(exportBinding(name, name))
          }
        }
      }
    } else if (group.type === 'specifiers') {
      // export { selected as action, skipped }
      // ⬇️
      // const $$module_0_binding_action = __WRAP__(selected, 'action')
      // export { $$module_0_binding_action as action }
      // export { skipped }
      const preserved: string[] = []
      let selected = false
      for (const entry of group.exports) {
        tinyassert(entry.node.local.type === 'Identifier')
        if (entry.node.exported.type !== 'Identifier') {
          throw Object.assign(
            new Error('unsupported string literal export name'),
            { pos: entry.node.exported.start },
          )
        }
        const { localName, exportName, meta } = entry
        if (!filter(exportName, meta)) {
          preserved.push(
            localName === exportName
              ? localName
              : `${localName} as ${exportName}`,
          )
          continue
        }
        selected = true

        let implementation = localName
        if (group.node.source) {
          // export { remote as action } from './dep' with { type: 'json' }
          // ⬇️ (preserve the source tail, including attributes)
          // import { remote as $$module_0_implementation_action } from './dep' with { type: 'json' }
          // const $$module_0_binding_action = __WRAP__($$module_0_implementation_action, 'action')
          // export { $$module_0_binding_action as action }
          implementation = createName('implementation', exportName)
          const sourceTail = input
            .slice(group.node.source.end, group.node.end)
            .replace(/;?\s*$/, ';')
          wrappedBindingCode.push(
            `import { ${localName} as ${implementation} } from ${group.node.source.raw}${sourceTail}`,
          )
        }
        emitWrappedBinding(implementation, exportName, meta)
      }

      if (selected) {
        output.remove(group.node.start, group.node.end)
        if (preserved.length > 0) {
          const source = group.node.source
            ? ` from ${group.node.source.raw}`
            : ''
          wrappedBindingCode.push(
            `export { ${preserved.join(', ')} }${source};`,
          )
        }
      }
    } else if (group.type === 'export-all') {
      // export * from './dep'
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: group.node.start,
        })
      }
    } else if (group.type === 'default') {
      let meta: ModuleExportMeta

      if (group.directFunction) {
        const declaration = group.directFunction.node
        // export default async function Page() {}
        // ⬇️
        // const $$module_0_implementation_Page = async function ...
        // const Page = __WRAP__($$module_0_implementation_Page, 'default')
        // export default Page
        //
        // export default async () => {}
        // ⬇️
        // const $$module_0_implementation_default = async () => {}
        // export default __WRAP__($$module_0_implementation_default, 'default')
        const sourceName = group.directFunction.originalName
        meta = group.meta
        if (!filter('default', meta)) continue

        const replacement = hoistFunction(
          group.directFunction,
          sourceName,
          'default',
          meta,
        )
        output.remove(group.node.start, declaration.start)
        output.appendLeft(
          declaration.start,
          declaration.type === 'FunctionDeclaration' && declaration.id
            ? `const ${sourceName} = ${replacement};\nexport default ${sourceName};`
            : `export default ${replacement};`,
        )
      } else {
        const declaration = group.node.declaration
        let implementation: string
        if (declaration.type === 'ClassDeclaration' && declaration.id) {
          // export default class Page {}
          // ^^^^^^^^^^^^^^
          // ⬇️ (remove `export default` and append wrapped binding)
          // class Page {}
          // const $$module_0_binding_default = __WRAP__(Page, 'default')
          // export { $$module_0_binding_default as default }
          implementation = declaration.id.name
          meta = group.meta
          if (!filter('default', meta)) continue
          output.remove(group.node.start, declaration.start)
        } else {
          // export default current
          // current = next
          // ⬇️ (snapshot at the original export site)
          // const $$module_0_implementation_default = current
          // current = next
          // const $$module_0_binding_default = __WRAP__($$module_0_implementation_default, 'default')
          // export { $$module_0_binding_default as default }
          implementation = createName('implementation', 'default')
          meta = group.meta
          if (!filter('default', meta)) continue
          validateNonAsyncFunction(options, declaration)
          const prefix = input.slice(group.node.start, declaration.start)
          output.update(
            group.node.start,
            declaration.start,
            prefix.replace(
              /^export\s+default/,
              () => `const ${implementation} =`,
            ),
          )
        }
        emitWrappedBinding(implementation, 'default', meta)
      }
    }
  }

  if (wrappedBindingCode.length > 0) {
    // const value = init()
    // ⬇️ (append)
    // const $$module_0_binding_value = __WRAP__(value, 'value')
    // export { $$module_0_binding_value as value }
    output.append(`\n${wrappedBindingCode.join('\n')}\n`)
  }

  return {
    output,
    references,
    referenceNames: references.map((reference) => reference.exportName),
  }
}
