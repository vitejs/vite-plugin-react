import { tinyassert } from '@hiogawa/utils'
import type {
  ExportDefaultDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  Node,
  Program,
} from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { scanModuleExports, type ModuleExportMeta } from './module-exports'
import { validateNonAsyncFunction } from './utils'

type FunctionNode =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression

export type TransformModuleExportWrapContext = {
  implementation: string
  binding: string
  exportName: string
  meta: ModuleExportMeta
}

export type TransformModuleExportWrapFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformModuleExportWrapOptions = {
  runtime: (context: TransformModuleExportWrapContext) => string
  filter?: TransformModuleExportWrapFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

/**
 * Produces canonical wrapper exports. Directly exported functions are hoisted
 * and replaced at their original expression sites. Other selected exports keep
 * their source values and receive canonical bindings at the export boundary.
 */
export function transformModuleExportWrap(
  source: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportWrapOptions,
): {
  output: MagicString
  references: TransformModuleExportWrapContext[]
  referenceNames: string[]
} {
  const ast = viteAst as unknown as Program
  let input = source
  if (!input.endsWith('\n')) input += '\n'
  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportWrapContext[] = []
  const fallbackCode: string[] = []
  const hoistPosition = getHoistPosition(ast)

  function createContext(
    implementation: string,
    binding: string,
    exportName: string,
    meta: ModuleExportMeta,
  ): TransformModuleExportWrapContext {
    const context = { implementation, binding, exportName, meta }
    references.push(context)
    return context
  }

  function runtime(context: TransformModuleExportWrapContext): string {
    return `/* #__PURE__ */ ${options.runtime(context)}`
  }

  function exportBinding(binding: string, exportName: string): string {
    return binding === exportName
      ? `export { ${binding} };`
      : `export { ${binding} as ${exportName} };`
  }

  function createName(
    kind: 'implementation' | 'binding',
    name: string,
  ): string {
    return `$$module_${references.length}_${kind}_${name}`
  }

  function emitFallback(
    implementation: string,
    exportName: string,
    meta: ModuleExportMeta,
  ): void {
    const binding = createName('binding', exportName)
    const context = createContext(implementation, binding, exportName, meta)
    fallbackCode.push(
      `const ${binding} = ${runtime(context)};`,
      exportBinding(binding, exportName),
    )
  }

  function hoistFunction(
    node: FunctionNode,
    sourceName: string,
    exportName: string,
    meta: ModuleExportMeta,
  ): string {
    validateNonAsyncFunction(options, node)
    const implementation = createName('implementation', sourceName)
    const originalPrefix =
      node.type === 'FunctionDeclaration' && node.id
        ? input.slice(node.start, node.id.start) +
          implementation +
          input.slice(node.id.end, node.body.start)
        : input.slice(node.start, node.body.start)
    const originalName =
      node.type !== 'ArrowFunctionExpression' && node.id
        ? node.id.name
        : sourceName

    output.update(
      node.start,
      node.body.start,
      `\nconst ${implementation} = ${originalPrefix}`,
    )
    output.appendLeft(
      node.end,
      `;\n/* #__PURE__ */ Object.defineProperty(${implementation}, "name", { value: ${JSON.stringify(originalName)} });\n`,
    )
    output.move(node.start, node.end, hoistPosition)

    const context = createContext(implementation, sourceName, exportName, meta)
    return runtime(context)
  }

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      const [entry] = group.exports
      const { localName: name } = entry
      const meta = entry.meta
      if (!filter(entry.exportName, meta)) continue

      if (group.declaration.type === 'FunctionDeclaration') {
        const replacement = hoistFunction(
          group.declaration,
          name,
          entry.exportName,
          meta,
        )
        output.remove(group.node.start, group.declaration.start)
        output.appendLeft(
          group.declaration.start,
          `export const ${name} = ${replacement};`,
        )
      } else {
        output.remove(group.node.start, group.declaration.start)
        emitFallback(name, entry.exportName, meta)
      }
    } else if (group.type === 'variable-declaration') {
      const fallbackNames = new Set<string>()
      const exportNames = group.declarators.flatMap((item) =>
        item.exports.map((entry) => entry.exportName),
      )

      for (const declarator of group.declarators) {
        const directFunction =
          declarator.node.id.type === 'Identifier' &&
          declarator.node.init &&
          isFunctionNode(declarator.node.init)
            ? declarator.node.init
            : undefined
        let validate = false

        for (const entry of declarator.exports) {
          const meta: ModuleExportMeta = {
            ...entry.meta,
            isFunction: directFunction
              ? true
              : declarator.node.init
                ? getIsFunction(declarator.node.init)
                : undefined,
          }
          if (!filter(entry.exportName, meta)) continue
          validate = true

          if (directFunction) {
            const replacement = hoistFunction(
              directFunction,
              entry.localName,
              entry.exportName,
              meta,
            )
            output.appendLeft(directFunction.start, replacement)
          } else {
            fallbackNames.add(entry.exportName)
            emitFallback(entry.localName, entry.exportName, meta)
          }
        }

        if (validate && declarator.node.init && !directFunction) {
          validateNonAsyncFunction(options, declarator.node.init)
        }
      }

      if (fallbackNames.size > 0) {
        output.remove(group.node.start, group.declaration.start)
        for (const name of exportNames) {
          if (!fallbackNames.has(name))
            fallbackCode.push(exportBinding(name, name))
        }
      }
    } else if (group.type === 'specifiers') {
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
          implementation = createName('implementation', exportName)
          const sourceTail = input
            .slice(group.node.source.end, group.node.end)
            .replace(/;?\s*$/, ';')
          fallbackCode.push(
            `import { ${localName} as ${implementation} } from ${group.node.source.raw}${sourceTail}`,
          )
        }
        emitFallback(implementation, exportName, meta)
      }

      if (selected) {
        output.remove(group.node.start, group.node.end)
        if (preserved.length > 0) {
          const source = group.node.source
            ? ` from ${group.node.source.raw}`
            : ''
          fallbackCode.push(`export { ${preserved.join(', ')} }${source};`)
        }
      }
    } else if (group.type === 'export-all') {
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: group.node.start,
        })
      }
    } else if (group.type === 'default') {
      const declaration = group.node.declaration
      let meta: ModuleExportMeta

      if (isFunctionNode(declaration)) {
        const sourceName =
          declaration.type !== 'ArrowFunctionExpression' && declaration.id
            ? declaration.id.name
            : 'default'
        meta = group.meta
        if (!filter('default', meta)) continue

        const replacement = hoistFunction(
          declaration,
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
        let implementation: string
        if (declaration.type === 'ClassDeclaration' && declaration.id) {
          implementation = declaration.id.name
          meta = group.meta
          if (!filter('default', meta)) continue
          output.remove(group.node.start, declaration.start)
        } else {
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
        emitFallback(implementation, 'default', meta)
      }
    }
  }

  if (fallbackCode.length > 0) {
    output.append(`\n${fallbackCode.join('\n')}\n`)
  }

  return {
    output,
    references,
    referenceNames: references.map((reference) => reference.exportName),
  }
}

function isFunctionNode(
  node: Node | ExportDefaultDeclaration['declaration'],
): node is FunctionNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

function getIsFunction(
  node: Node | ExportDefaultDeclaration['declaration'],
): boolean | undefined {
  if (isFunctionNode(node)) return true
  if (
    node.type === 'ClassDeclaration' ||
    node.type === 'Literal' ||
    node.type === 'ObjectExpression' ||
    node.type === 'ArrayExpression' ||
    node.type === 'ClassExpression'
  ) {
    return false
  }
}

function getHoistPosition(ast: Program): number {
  for (const statement of ast.body) {
    const isDirective =
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'Literal' &&
      typeof statement.expression.value === 'string'
    if (!isDirective) return statement.start
  }
  return 0
}
