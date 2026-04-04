import { tinyassert } from '@hiogawa/utils'
import type { Identifier, Pattern, Program } from 'estree'

export function hasDirective(
  body: Program['body'],
  directive: string,
): boolean {
  return !!body.find(
    (stmt) =>
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'Literal' &&
      typeof stmt.expression.value === 'string' &&
      stmt.expression.value === directive,
  )
}

export function getExportNames(
  ast: Program,
  options: {
    ignoreExportAllDeclaration?: boolean
  },
): {
  exportNames: string[]
} {
  const exportNames: string[] = []

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          /**
           * export function foo() {}
           */
          exportNames.push(node.declaration.id.name)
        } else if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
          for (const decl of node.declaration.declarations) {
            exportNames.push(...extractNames(decl.id))
          }
        } else {
          node.declaration satisfies never
        }
      } else {
        /**
         * export { foo, bar as car } from './foo'
         * export { foo, bar as car }
         */
        for (const spec of node.specifiers) {
          tinyassert(spec.exported.type === 'Identifier')
          exportNames.push(spec.exported.name)
        }
      }
    }

    /**
     * export * from './foo'
     */
    if (
      !options.ignoreExportAllDeclaration &&
      node.type === 'ExportAllDeclaration'
    ) {
      throw new Error('unsupported ExportAllDeclaration')
    }

    /**
     * export default function foo() {}
     * export default class Foo {}
     * export default () => {}
     */
    if (node.type === 'ExportDefaultDeclaration') {
      exportNames.push('default')
    }
  }

  return { exportNames }
}

// Copied from periscopic `extract_names` / `extract_identifiers` in `src/index.js`.
export function extractNames(param: Pattern): string[] {
  return extractIdentifiers(param).map((n) => n.name)
}

export function extractIdentifiers(
  param: Pattern,
  nodes: Identifier[] = [],
): Identifier[] {
  switch (param.type) {
    case 'Identifier':
      nodes.push(param)
      break
    case 'MemberExpression': {
      let obj = param as any
      while (obj.type === 'MemberExpression') {
        obj = obj.object
      }
      nodes.push(obj)
      break
    }
    case 'ObjectPattern':
      for (const prop of param.properties) {
        extractIdentifiers(
          prop.type === 'RestElement' ? prop : prop.value,
          nodes,
        )
      }
      break
    case 'ArrayPattern':
      for (const el of param.elements) {
        if (el) extractIdentifiers(el, nodes)
      }
      break
    case 'RestElement':
      extractIdentifiers(param.argument, nodes)
      break
    case 'AssignmentPattern':
      extractIdentifiers(param.left, nodes)
      break
  }
  return nodes
}
