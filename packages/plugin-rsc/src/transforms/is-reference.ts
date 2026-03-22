// https://github.com/Rich-Harris/is-reference/blob/master/src/index.js

import type { Identifier, Node } from 'estree'

/**
 * Check if a node is a reference to an identifier, as opposed to a declaration or a property name.
 */
export function isReference(
  node: Node,
  parent: Node | null,
): node is Identifier {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node)
  }

  if (node.type !== 'Identifier') return false

  switch (parent?.type) {
    // disregard `bar` in `foo.bar`
    case 'MemberExpression':
      return parent.computed || node === parent.object

    // disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
    case 'MethodDefinition':
      return parent.computed

    // disregard the `meta` in `import.meta`
    case 'MetaProperty':
      return parent.meta === node

    // disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
    case 'PropertyDefinition':
      return parent.computed || node === parent.value

    // disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
    case 'Property':
      return parent.computed || node === parent.value

    // disregard the `bar` in `export { foo as bar }` or
    // the foo in `import { foo as bar }`
    case 'ExportSpecifier':
    case 'ImportSpecifier':
      return node === parent.local

    // disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return false

    default:
      return true
  }
}
