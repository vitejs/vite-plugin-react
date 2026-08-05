import type { Node, Program } from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { scanModuleExports, type ModuleExportMeta } from './module-export-scan'
import { hasDirective, validateNonAsyncFunction } from './utils'

/** Selects which statically discovered exports become proxies. */
export type TransformProxyExportFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformProxyExportOptions = {
  /**
   * Original module source used to preserve source mappings and initializer
   * text. Required by `keep`.
   */
  code?: string
  /**
   * Returns the proxy expression for an export name. In `keep` mode, `value`
   * contains the original initializer for a single identifier declaration.
   */
  runtime: (name: string, meta?: { value: string }) => string
  /**
   * Removes a bare `export *` instead of rejecting it. With `keep`, the
   * declaration is retained.
   * @default false
   */
  ignoreExportAllDeclaration?: boolean
  /** Rejects statically known values that are not async functions. */
  rejectNonAsyncFunction?: boolean
  /**
   * Selects exports before validation and proxy generation. Filtered exports
   * are omitted from both the generated module and `exportNames`.
   *
   * Cannot be combined with `keep`.
   * @default () => true
   */
  filter?: TransformProxyExportFilter
  /**
   * Retains non-export implementation code and passes a single identifier
   * declaration's initializer to `runtime`. This is an escape hatch for Waku's
   * `allowServer` transform.
   *
   * Requires `code` and cannot be combined with `filter`.
   * @default false
   */
  keep?: boolean
}

export type TransformProxyExportResult = {
  exportNames: string[]
  output: MagicString
}

export function transformDirectiveProxyExport(
  ast: ESTree.Program,
  options: {
    directive: string
  } & TransformProxyExportOptions,
): TransformProxyExportResult | undefined {
  if (!hasDirective(ast.body, options.directive)) {
    return
  }
  return transformProxyExport(ast, options)
}

/**
 * Replaces selected exports with proxies created by `runtime` and removes the
 * original module implementation.
 *
 * Conceptually, with a filter that excludes `objectValue`:
 *
 * ```js
 * import { dependency } from './dep'
 * export async function action() {}
 * export const objectValue = {}
 * export { dependency as renamed }
 * export default async () => {}
 * ```
 *
 * becomes:
 *
 * ```js
 * export const action = __PROXY__('action')
 * export const renamed = __PROXY__('renamed')
 * export default __PROXY__('default')
 * ```
 *
 * Unlike `transformWrapExport`, this transform does not evaluate the original
 * exports. Unknown values are represented only by their export names, so the
 * caller must filter solely from the available static `ModuleExportMeta`.
 * `keep` is a specialized mode that retains non-export implementation code and
 * passes a single variable initializer to `runtime`.
 */
export function transformProxyExport(
  viteAst: ESTree.Program,
  options: TransformProxyExportOptions,
): TransformProxyExportResult {
  const ast = viteAst as unknown as Program
  if (options.keep && typeof options.code !== 'string') {
    throw new Error('`keep` option requires `code`')
  }
  if (options.keep && options.filter) {
    throw new Error('`filter` option is not supported with `keep`')
  }
  const output = new MagicString(options.code ?? ' '.repeat(ast.end))
  const exportNames: string[] = []
  const filter = options.filter ?? (() => true)

  /** Replaces one complete export statement with proxy exports. */
  function createExport(node: Node, names: string[]) {
    exportNames.push(...names)
    const newCode = names
      .map(
        (name) =>
          (name === 'default' ? `export default` : `export const ${name} =`) +
          ` /* #__PURE__ */ ${options.runtime(name)};\n`,
      )
      .join('')
    output.update(node.start, node.end, newCode)
  }

  const exportNodes = new Set<Node>()
  for (const group of scanModuleExports(viteAst)) {
    const node = group.node as Node
    exportNodes.add(node)

    if (group.type === 'declaration') {
      // export function action() {}
      // -> export const action = __PROXY__('action')
      const entry = group.export
      if (filter(entry.exportName, entry.meta)) {
        validateNonAsyncFunction(options, group.declaration)
        createExport(node, [entry.exportName])
      } else {
        output.remove(node.start, node.end)
      }
    } else if (group.type === 'variable-declaration') {
      // export const selected = init(), skipped = {}
      // -> export const selected = __PROXY__('selected')
      const selectedNames: string[] = []
      for (const declarator of group.declarators) {
        const names = declarator.exports
          .filter((entry) => filter(entry.exportName, entry.meta))
          .map((entry) => entry.exportName)
        if (
          declarator.node.init &&
          (!options.filter ||
            declarator.exports.length === 0 ||
            names.length > 0)
        ) {
          validateNonAsyncFunction(options, declarator.node.init)
        }
        selectedNames.push(...names)
      }
      if (options.keep && options.code && selectedNames.length === 1) {
        // Waku's `keep` mode retains the initializer as the proxy value:
        // export const value = init()
        // -> export const value = __PROXY__(init(), 'value')
        if (group.declaration.declarations.length === 1) {
          const decl = group.declaration.declarations[0]!
          if (decl.id.type === 'Identifier' && decl.init) {
            const name = decl.id.name
            const value = options.code.slice(decl.init.start, decl.init.end)
            const newCode = `export const ${name} = /* #__PURE__ */ ${options.runtime(
              name,
              { value },
            )};`
            output.update(node.start, node.end, newCode)
            exportNames.push(name)
            continue
          }
        }
      }
      if (selectedNames.length > 0) {
        createExport(node, selectedNames)
      } else {
        output.remove(node.start, node.end)
      }
    } else if (group.type === 'specifiers') {
      // export { local as renamed } from './dep'
      // -> export const renamed = __PROXY__('renamed')
      const names = group.exports
        .filter((entry) => {
          if (entry.node.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: entry.node.exported.start },
            )
          }
          return filter(entry.exportName, entry.meta)
        })
        .map((entry) => entry.exportName)
      if (names.length > 0) {
        createExport(node, names)
      } else {
        output.remove(node.start, node.end)
      }
    } else if (group.type === 'export-all') {
      // A namespace re-export has one known name. A bare export-all cannot be
      // represented without resolving the dependency's export names.
      if (group.node.exported?.type === 'Identifier') {
        const name = group.node.exported.name
        if (filter(name, {})) {
          createExport(node, [name])
        } else {
          output.remove(node.start, node.end)
        }
      } else if (!options.ignoreExportAllDeclaration) {
        throw new Error('unsupported ExportAllDeclaration')
      } else if (!options.keep) {
        output.remove(node.start, node.end)
      }
    } else if (group.type === 'default') {
      // export default async () => {}
      // -> export default __PROXY__('default')
      if (filter('default', group.meta)) {
        validateNonAsyncFunction(options, group.node.declaration)
        createExport(node, ['default'])
      } else {
        output.remove(node.start, node.end)
      }
    }
  }

  if (!options.keep) {
    // Imports, directives, and implementation statements must not execute in
    // the graph that consumes these proxies.
    for (const node of ast.body) {
      if (!exportNodes.has(node)) {
        output.remove(node.start, node.end)
      }
    }
  }

  return { exportNames, output }
}
