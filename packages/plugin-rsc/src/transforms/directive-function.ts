import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
} from 'estree'
import { walk } from 'estree-walker'

export type DirectiveFunction =
  | ArrowFunctionExpression
  | FunctionDeclaration
  | FunctionExpression

/**
 * Applies the function restrictions used by Next.js Server Functions.
 * Unknown and non-function values are ignored so transform callbacks can pass
 * `meta.valueNode` directly.
 */
export function validateDirectiveFunction(
  valueNode: { type: string } | null | undefined,
  directive: string,
): void {
  if (!valueNode) return
  const node = valueNode as Node
  if (!isFunction(node)) return

  walk(node, {
    enter(child, parent) {
      if (
        child !== node &&
        (child.type === 'FunctionDeclaration' ||
          child.type === 'FunctionExpression' ||
          child.type === 'ClassDeclaration' ||
          child.type === 'ClassExpression')
      ) {
        this.skip()
        return
      }

      const expression =
        child.type === 'ThisExpression' && !isJsxDevSourceThis(child, parent)
          ? 'this'
          : child.type === 'Super'
            ? 'super'
            : child.type === 'Identifier' &&
                child.name === 'arguments' &&
                isReferenceIdentifier(child, parent)
              ? 'arguments'
              : undefined
      if (expression) {
        throw Object.assign(
          new Error(
            `${JSON.stringify(directive)} functions cannot use ${JSON.stringify(expression)}.`,
          ),
          { pos: child.start },
        )
      }
    },
  })
}

function isFunction(node: Node): node is DirectiveFunction {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  )
}

function isJsxDevSourceThis(node: Node, parent: Node | null): boolean {
  return (
    node.type === 'ThisExpression' &&
    parent?.type === 'CallExpression' &&
    parent.arguments.length === 6 &&
    parent.arguments[5] === node &&
    parent.callee.type === 'Identifier' &&
    (parent.callee.name === 'jsxDEV' || parent.callee.name === '_jsxDEV')
  )
}

function isReferenceIdentifier(node: Identifier, parent: Node | null): boolean {
  if (!parent) return true
  if (
    parent.type === 'MemberExpression' &&
    parent.property === node &&
    !parent.computed
  ) {
    return false
  }
  if (
    (parent.type === 'Property' ||
      parent.type === 'MethodDefinition' ||
      parent.type === 'PropertyDefinition') &&
    parent.key === node &&
    !parent.computed &&
    !(parent.type === 'Property' && parent.shorthand)
  ) {
    return false
  }
  return true
}
