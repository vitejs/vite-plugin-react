import type { Directive, ExportDefaultDeclaration } from 'estree'
import type { Identifier, Node, Pattern, Program } from 'estree'
import type { ESTree } from 'vite'

export function isDirective(node: Node): node is Directive {
  // Directive is not its own `type`
  // https://github.com/estree/estree/blob/master/es5.md#directive
  return node.type === 'ExpressionStatement' && 'directive' in node
}

export function hasDirective(
  viteBody: ESTree.Program['body'],
  directive: string,
): boolean {
  const body = viteBody as unknown as Program['body']
  return body.some((stmt) => isDirective(stmt) && stmt.directive === directive)
}

// Copied from periscopic `extract_names` / `extract_identifiers`
export function extractNames(param: Pattern): string[] {
  return extractIdentifiers(param).map((n) => n.name)
}

// Copied from periscopic and intentionally broader than this repo's current
// declaration-oriented use cases.
//
// ESTree's `Pattern` type also covers assignment targets, where
// `MemberExpression` can appear (for example `({ x: obj.y } = value)`), so this
// helper preserves periscopic's behavior of reducing `a.b.c` to the base
// identifier `a`.
//
// In this repo, current callers use it only for declaration/binding positions
// (`VariableDeclarator.id`, function params, catch params), where
// `MemberExpression` should not appear for valid input. That branch is kept for
// compatibility with the original helper rather than because current
// declaration use cases require it.
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

export function validateNonAsyncFunction(
  opts: { rejectNonAsyncFunction?: boolean },
  // export default function/class can be unnamed
  node: Node | ExportDefaultDeclaration['declaration'],
): void {
  if (
    node.type === 'Literal' ||
    node.type === 'ObjectExpression' ||
    node.type === 'ArrayExpression' ||
    node.type === 'ClassDeclaration' ||
    node.type === 'ClassExpression' ||
    ((node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') &&
      !node.async)
  ) {
    rejectNonAsyncFunction(opts, node.start)
  }
}

export function rejectNonAsyncFunction(
  opts: { rejectNonAsyncFunction?: boolean },
  pos: number,
): void {
  if (opts.rejectNonAsyncFunction) {
    throw Object.assign(new Error(`unsupported non async function`), { pos })
  }
}
