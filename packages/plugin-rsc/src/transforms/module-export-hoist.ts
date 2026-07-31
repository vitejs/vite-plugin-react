import type {
  ArrowFunctionExpression,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  FunctionExpression,
  Node,
  Program,
  VariableDeclarator,
} from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import type {
  TransformModuleExportFilter,
  TransformModuleExportMeta,
} from './module-export'
import { hasDirective, validateNonAsyncFunction } from './utils'

type DefaultFunctionDeclaration = Extract<
  ExportDefaultDeclaration['declaration'],
  { type: 'FunctionDeclaration' }
>

type ModuleFunction =
  | DefaultFunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression

type HoistCandidate = {
  node: ModuleFunction
  parent: ExportDefaultDeclaration | ExportNamedDeclaration | VariableDeclarator
  exportName: string
  sourceName: string
  meta: TransformModuleExportMeta
}

export type TransformModuleExportHoistContext = {
  implementation: string
  exportName: string
  meta: TransformModuleExportMeta
}

export type TransformModuleExportHoistOptions = {
  directive: string
  runtime: (context: TransformModuleExportHoistContext) => string
  filter?: TransformModuleExportFilter
  rejectNonAsyncFunction?: boolean
}

/**
 * Treats a module directive as though it were attached to each directly exported
 * function, then applies inline-style implementation hoisting and expression-site
 * runtime replacement. Local export specifiers and re-exports are left unchanged.
 */
export function transformModuleExportHoist(
  source: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportHoistOptions,
): {
  output: MagicString
  references: TransformModuleExportHoistContext[]
  referenceNames: string[]
} {
  const ast = viteAst as unknown as Program
  let input = source
  if (!input.endsWith('\n')) input += '\n'
  const output = new MagicString(input)
  const references: TransformModuleExportHoistContext[] = []
  const filter = options.filter ?? (() => true)
  if (!hasDirective(viteAst.body, options.directive)) {
    return { output, references, referenceNames: [] }
  }

  const candidates: HoistCandidate[] = []

  for (const statement of ast.body) {
    if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
      if (statement.declaration.type === 'FunctionDeclaration') {
        const name = statement.declaration.id.name
        candidates.push({
          node: statement.declaration,
          parent: statement,
          exportName: name,
          sourceName: name,
          meta: {
            localName: name,
            declarationKind: 'function',
            isFunction: true,
          },
        })
      } else if (statement.declaration.type === 'VariableDeclaration') {
        for (const declaration of statement.declaration.declarations) {
          if (
            declaration.id.type === 'Identifier' &&
            declaration.init &&
            isFunctionNode(declaration.init)
          ) {
            candidates.push({
              node: declaration.init,
              parent: declaration,
              exportName: declaration.id.name,
              sourceName: declaration.id.name,
              meta: {
                localName: declaration.id.name,
                declarationKind: statement.declaration.kind,
                isFunction: true,
              },
            })
          }
        }
      }
    } else if (
      statement.type === 'ExportDefaultDeclaration' &&
      isFunctionNode(statement.declaration)
    ) {
      const sourceName =
        statement.declaration.type !== 'ArrowFunctionExpression' &&
        statement.declaration.id
          ? statement.declaration.id.name
          : 'anonymous_default'
      candidates.push({
        node: statement.declaration,
        parent: statement,
        exportName: 'default',
        sourceName,
        meta: {
          localName:
            sourceName === 'anonymous_default' ? undefined : sourceName,
          declarationKind:
            statement.declaration.type === 'FunctionDeclaration'
              ? 'function'
              : undefined,
          isFunction: true,
        },
      })
    }
  }

  for (const candidate of candidates) {
    if (!filter(candidate.exportName, candidate.meta)) continue
    const node = candidate.node
    if (node.type === 'FunctionExpression' && node.id) {
      throw Object.assign(
        new Error('unsupported named function expression export'),
        { pos: node.start },
      )
    }
    validateNonAsyncFunction(options, node)

    const implementation = `$$module_hoist_${references.length}_${candidate.sourceName}`
    const params = node.params
      .map((parameter) => input.slice(parameter.start, parameter.end))
      .join(', ')
    const prefix = `\n;${node.async ? 'async ' : ''}function${node.generator ? '*' : ''} ${implementation}(${params}) `
    if (node.body.type === 'BlockStatement') {
      output.update(node.start, node.body.start, prefix)
      output.appendLeft(node.end, ';')
    } else {
      output.update(node.start, node.body.start, `${prefix}{ return `)
      output.appendLeft(node.end, ' };')
    }
    output.appendLeft(
      node.end,
      `\n/* #__PURE__ */ Object.defineProperty(${implementation}, "name", { value: ${JSON.stringify(candidate.sourceName)} });\n`,
    )
    output.move(node.start, node.end, input.length)

    const context: TransformModuleExportHoistContext = {
      implementation,
      exportName: candidate.exportName,
      meta: candidate.meta,
    }
    references.push(context)
    const runtime = `/* #__PURE__ */ ${options.runtime(context)}`

    if (node.type === 'FunctionDeclaration' && node.id) {
      const sourceName = node.id.name
      let replacement = `const ${sourceName} = ${runtime};`
      if (candidate.parent.type === 'ExportDefaultDeclaration') {
        output.remove(candidate.parent.start, node.start)
        replacement += `\nexport default ${sourceName};`
      }
      output.appendLeft(node.start, replacement)
    } else {
      output.appendLeft(node.start, runtime)
    }
  }

  return {
    output,
    references,
    referenceNames: references.map((reference) => reference.exportName),
  }
}

function isFunctionNode(
  node: Node | ExportDefaultDeclaration['declaration'],
): node is ModuleFunction {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}
