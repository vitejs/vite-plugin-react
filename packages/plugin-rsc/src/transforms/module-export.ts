import { tinyassert } from '@hiogawa/utils'
import type {
  ExportDefaultDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  Node,
  Program,
  VariableDeclaration,
} from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { extractNames, validateNonAsyncFunction } from './utils'

type FunctionNode =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression

export type TransformModuleExportMeta = {
  localName?: string
  declarationKind?: 'function' | 'class' | VariableDeclaration['kind']
  isFunction?: boolean
  defaultExportIdentifierName?: string
}

export type TransformModuleExportContext = {
  implementation: string
  binding: string
  exportName: string
  meta: TransformModuleExportMeta
}

export type TransformModuleExportFilter = (
  name: string,
  meta: TransformModuleExportMeta,
) => boolean

export type TransformModuleExportOptions = {
  runtime: (context: TransformModuleExportContext) => string
  filter?: TransformModuleExportFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

/**
 * Produces canonical wrapper exports. Directly exported functions are hoisted
 * and replaced at their original expression sites. Other selected exports keep
 * their source values and receive canonical bindings at the export boundary.
 */
export function transformModuleExport(
  source: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportOptions,
): {
  output: MagicString
  references: TransformModuleExportContext[]
  referenceNames: string[]
} {
  const ast = viteAst as unknown as Program
  let input = source
  if (!input.endsWith('\n')) input += '\n'
  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportContext[] = []
  const fallbackCode: string[] = []
  const hoistPosition = getHoistPosition(ast)

  function createContext(
    implementation: string,
    binding: string,
    exportName: string,
    meta: TransformModuleExportMeta,
  ): TransformModuleExportContext {
    const context = { implementation, binding, exportName, meta }
    references.push(context)
    return context
  }

  function runtime(context: TransformModuleExportContext): string {
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
    meta: TransformModuleExportMeta,
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
    meta: TransformModuleExportMeta,
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

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.type === 'FunctionDeclaration') {
          tinyassert(node.declaration.id)
          const name = node.declaration.id.name
          const meta: TransformModuleExportMeta = {
            localName: name,
            declarationKind: 'function',
            isFunction: true,
          }
          if (!filter(name, meta)) continue

          const replacement = hoistFunction(node.declaration, name, name, meta)
          output.remove(node.start, node.declaration.start)
          output.appendLeft(
            node.declaration.start,
            `export const ${name} = ${replacement};`,
          )
        } else if (node.declaration.type === 'ClassDeclaration') {
          tinyassert(node.declaration.id)
          const name = node.declaration.id.name
          const meta: TransformModuleExportMeta = {
            localName: name,
            declarationKind: 'class',
            isFunction: false,
          }
          if (!filter(name, meta)) continue

          output.remove(node.start, node.declaration.start)
          emitFallback(name, name, meta)
        } else if (node.declaration.type === 'VariableDeclaration') {
          const declaration = node.declaration
          const fallbackNames = new Set<string>()
          const exportNames: string[] = []

          for (const declarator of declaration.declarations) {
            const names = extractNames(declarator.id)
            exportNames.push(...names)
            const directFunction =
              declarator.id.type === 'Identifier' &&
              declarator.init &&
              isFunctionNode(declarator.init)
                ? declarator.init
                : undefined
            let validate = false

            for (const name of names) {
              const meta: TransformModuleExportMeta = {
                localName: name,
                declarationKind: declaration.kind,
                isFunction: directFunction
                  ? true
                  : declarator.init
                    ? getIsFunction(declarator.init)
                    : undefined,
              }
              if (!filter(name, meta)) continue
              validate = true

              if (directFunction && declarator.id.type === 'Identifier') {
                const replacement = hoistFunction(
                  directFunction,
                  name,
                  name,
                  meta,
                )
                output.appendLeft(directFunction.start, replacement)
              } else {
                fallbackNames.add(name)
                emitFallback(name, name, meta)
              }
            }

            if (validate && declarator.init && !directFunction) {
              validateNonAsyncFunction(options, declarator.init)
            }
          }

          if (fallbackNames.size > 0) {
            output.remove(node.start, declaration.start)
            for (const name of exportNames) {
              if (!fallbackNames.has(name))
                fallbackCode.push(exportBinding(name, name))
            }
          }
        }
      } else if (node.specifiers.length > 0) {
        const preserved: string[] = []
        let selected = false
        for (const specifier of node.specifiers) {
          tinyassert(specifier.local.type === 'Identifier')
          if (specifier.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: specifier.exported.start },
            )
          }
          const localName = specifier.local.name
          const exportName = specifier.exported.name
          const meta: TransformModuleExportMeta = {}
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
          if (node.source) {
            implementation = createName('implementation', exportName)
            const sourceTail = input
              .slice(node.source.end, node.end)
              .replace(/;?\s*$/, ';')
            fallbackCode.push(
              `import { ${localName} as ${implementation} } from ${node.source.raw}${sourceTail}`,
            )
          }
          emitFallback(implementation, exportName, meta)
        }

        if (selected) {
          output.remove(node.start, node.end)
          if (preserved.length > 0) {
            const source = node.source ? ` from ${node.source.raw}` : ''
            fallbackCode.push(`export { ${preserved.join(', ')} }${source};`)
          }
        }
      }
    } else if (node.type === 'ExportAllDeclaration') {
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: node.start,
        })
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      const declaration = node.declaration
      let meta: TransformModuleExportMeta

      if (isFunctionNode(declaration)) {
        const sourceName =
          declaration.type !== 'ArrowFunctionExpression' && declaration.id
            ? declaration.id.name
            : 'default'
        meta = {
          localName: sourceName === 'default' ? undefined : sourceName,
          declarationKind:
            declaration.type === 'FunctionDeclaration' ? 'function' : undefined,
          isFunction: true,
        }
        if (!filter('default', meta)) continue

        const replacement = hoistFunction(
          declaration,
          sourceName,
          'default',
          meta,
        )
        output.remove(node.start, declaration.start)
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
          meta = {
            localName: declaration.id.name,
            declarationKind:
              declaration.type === 'ClassDeclaration' ? 'class' : undefined,
            isFunction: false,
          }
          if (!filter('default', meta)) continue
          output.remove(node.start, declaration.start)
        } else {
          implementation = createName('implementation', 'default')
          meta = {
            defaultExportIdentifierName:
              declaration.type === 'Identifier' ? declaration.name : undefined,
            isFunction: getIsFunction(declaration),
          }
          if (!filter('default', meta)) continue
          validateNonAsyncFunction(options, declaration)
          const prefix = input.slice(node.start, declaration.start)
          output.update(
            node.start,
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
