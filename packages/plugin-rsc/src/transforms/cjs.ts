import type { Program, Node } from 'estree'
import MagicString from 'magic-string'
import { analyze } from 'periscopic'
import { walk } from 'estree-walker'

export function transformCjsToEsm(
  code: string,
  ast: Program,
): { output: MagicString } {
  const output = new MagicString(code)
  const analyzed = analyze(ast)

  const parentNodes: Node[] = []
  const hoistedCodes: string[] = []
  let hoistIndex = 0
  walk(ast, {
    enter(node) {
      parentNodes.push(node)
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1
      ) {
        let isTopLevel = true
        for (const parent of parentNodes) {
          if (
            parent.type === 'FunctionExpression' ||
            parent.type === 'FunctionDeclaration' ||
            parent.type === 'ArrowFunctionExpression'
          ) {
            isTopLevel = false
          }
          // skip locally declared `require`
          const scope = analyzed.map.get(parent)
          if (scope && scope.declarations.has('require')) {
            return
          }
        }

        if (isTopLevel) {
          // top-level scope `require` to dynamic import
          // (this allows handling react development/production re-export within top-level if branch)
          output.update(node.start, node.callee.end, '(await import')
          output.appendRight(node.end, ')')
        } else {
          // hoist non top-level `require` to top-level
          const hoisted = `__cjs_to_esm_hoist_${hoistIndex}`
          const importee = code.slice(
            node.arguments[0]!.start,
            node.arguments[0]!.end,
          )
          hoistedCodes.push(`const ${hoisted} = await import(${importee});\n`)
          output.update(node.start, node.end, hoisted)
          hoistIndex++
        }
      }
    },
    leave() {
      parentNodes.pop()!
    },
  })
  for (const hoisted of hoistedCodes.reverse()) {
    output.prepend(hoisted)
  }
  output.prepend(`const exports = {}; const module = { exports };\n`)
  return { output }
}
