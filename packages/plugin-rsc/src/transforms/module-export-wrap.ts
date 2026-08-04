import { tinyassert } from '@hiogawa/utils'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { scanModuleExports, type ModuleExportMeta } from './module-export-scan'
import { validateNonAsyncFunction } from './utils'

export type TransformModuleExportWrapContext = {
  /** The local expression that evaluates to the exported implementation. */
  implementation: string
  /**
   * The runtime name of a directly exported function. When present, the
   * generated expression is responsible for assigning it to the wrapper.
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
 * Replaces selected module exports with runtime wrapper bindings while
 * preserving their original module-local values.
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
 * async function someFn(value) {
 *   return value
 * }
 * const someValue = createSomeValue()
 *
 * const $$module_0_binding_someFn = __WRAP__(someFn, 'someFn')
 * export { $$module_0_binding_someFn as someFn }
 * const $$module_1_binding_someValue = __WRAP__(someValue, 'someValue')
 * export { $$module_1_binding_someValue as someValue }
 * ```
 *
 * Here, `__WRAP__(...)` represents the expression returned by the `generate`
 * callback for each `{ implementation, originalName, exportName, meta }`
 * context. `originalName` is present for directly exported functions whose
 * name should be assigned to the generated wrapper.
 * `references` returns those contexts in wrapper creation order, while
 * `referenceNames` returns only their export names.
 *
 * Local references to both `someFn` and `someValue` retain their original
 * values. Importers receive the generated wrapper bindings.
 *
 * Generated `$$module_*` names are not deconflicted from user bindings,
 * consistent with the other transform helpers.
 */
export function transformModuleExportWrap(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportWrapOptions,
): TransformModuleExportWrapResult {
  // Keep appended wrapper bindings separated from source ending at EOF.
  if (!input.endsWith('\n')) {
    input += '\n'
  }

  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportWrapContext[] = []
  const wrappedBindingCode: string[] = []

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
   * const value = init()
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
    originalName?: string,
  ): void {
    const binding = createName('binding', exportName)
    const context = createContext(
      implementation,
      exportName,
      meta,
      originalName,
    )
    wrappedBindingCode.push(
      `const ${binding} = ${generate(context)};`,
      exportBinding(binding, exportName),
    )
  }

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      const [entry] = group.exports
      const { localName: name } = entry
      const meta = entry.meta
      if (!filter(entry.exportName, meta)) continue

      // export function f() {}
      // ^^^^^^
      // ⬇️
      // function f() {}.                               << strip export
      // const $$module_0_binding_f = __WRAP__(f, 'f')  << emit wrapper
      // export { $$module_0_binding_f as f }           << emit export
      if (group.directFunction) {
        validateNonAsyncFunction(options, group.directFunction.node)
      }
      output.remove(group.node.start, group.declaration.start)
      emitWrappedBinding(
        name,
        entry.exportName,
        meta,
        group.directFunction?.originalName,
      )
    } else if (group.type === 'variable-declaration') {
      // export const first = async () => {}, second = init()
      // ^^^^^^
      // ⬇️
      // const first = async () => {}, second = init()                 << strip export
      // const $$module_0_binding_first = __WRAP__(first, 'first')     << emit wrapper
      // export { $$module_0_binding_first as first }                  << emit export
      // const $$module_1_binding_second = __WRAP__(second, 'second')  << emit wrapper
      // export { $$module_1_binding_second as second }                << emit export

      const wrappedBindingNames = new Set<string>()
      const exportNames = group.declarators.flatMap((item) =>
        item.exports.map((entry) => entry.exportName),
      )

      for (const declarator of group.declarators) {
        const directFunction = declarator.directFunction
        let selected = false

        for (const entry of declarator.exports) {
          const meta = entry.meta
          if (!filter(entry.exportName, meta)) continue
          selected = true

          wrappedBindingNames.add(entry.exportName)
          emitWrappedBinding(
            entry.localName,
            entry.exportName,
            meta,
            directFunction?.originalName,
          )
        }

        if (selected && declarator.node.init) {
          validateNonAsyncFunction(
            options,
            directFunction?.node ?? declarator.node.init,
          )
        }
      }

      if (wrappedBindingNames.size > 0) {
        // export const selected = x, skipped = y
        // ^^^^^^
        // ⬇️
        // const selected = x, skipped = y  << strip export
        // export { skipped }               << add back filtered-out exports
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
          // export { remote as action } from './dep'
          // ⬇️
          // import { remote as $$module_0_implementation_action } from './dep'
          // const $$module_0_binding_action = __WRAP__($$module_0_implementation_action, 'action')
          // export { $$module_0_binding_action as action }
          implementation = createName('implementation', exportName)
          // TODO: Preserve import attributes from the original re-export.
          wrappedBindingCode.push(
            `import { ${localName} as ${implementation} } from ${group.node.source.raw};`,
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
      const declaration = group.node.declaration
      const meta = group.meta
      if (!filter('default', meta)) continue

      let implementation: string
      const namedDeclaration =
        (declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ClassDeclaration') &&
        declaration.id
      if (namedDeclaration) {
        // export default function Page() {}
        // ^^^^^^^^^^^^^^
        // ⬇️ (keep named declarations in place and append wrapped binding)
        // function Page() {}
        // const $$module_0_binding_default = __WRAP__(Page, 'default')
        // export { $$module_0_binding_default as default }
        implementation = namedDeclaration.name
        output.remove(group.node.start, declaration.start)
      } else {
        // export default current
        // ^^^^^^^^^^^^^^
        // ⬇️ (snapshot at the original export site)
        // const $$module_0_implementation_default = current
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // const $$module_0_binding_default = __WRAP__($$module_0_implementation_default, 'default')
        // export { $$module_0_binding_default as default }
        implementation = createName('implementation', 'default')
        output.update(
          group.node.start,
          declaration.start,
          `const ${implementation} = `,
        )
      }
      if (group.directFunction) {
        validateNonAsyncFunction(options, group.directFunction.node)
      } else if (!namedDeclaration) {
        validateNonAsyncFunction(options, declaration)
      }
      emitWrappedBinding(
        implementation,
        'default',
        meta,
        group.directFunction?.originalName,
      )
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
