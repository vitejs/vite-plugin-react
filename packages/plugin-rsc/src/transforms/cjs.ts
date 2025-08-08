import type { Program, Node } from 'estree'
import MagicString from 'magic-string'
import { analyze } from 'periscopic'
import * as cjsModuleLexer from 'cjs-module-lexer'
import { walk } from 'estree-walker'

export function transformCjsToEsm(
  code: string,
  ast: Program,
): { output: MagicString } {
  const output = new MagicString(code)
  const analyzed = analyze(ast)

  let parentNodes: Node[] = []
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
          output.prepend(`const ${hoisted} = await import(${importee});\n`)
          output.update(node.start, node.end, hoisted)
          hoistIndex++
        }
      }
    },
    leave() {
      parentNodes.pop()!
    },
  })

  // TODO: (we can move this out and handle eagerly transforming in vite transform?)
  // cjs-module-lexer to detect export names and re-exports
  cjsModuleLexer.initSync()
  const cjsParsed = cjsModuleLexer.parse(code)
  output.append(`;\n`)
  for (const e of cjsParsed.exports) {
    output.append(`export const ${e} = exports[${JSON.stringify(e)}];\n`)
  }
  // TODO: re-exports need to be parsed eagerly to find export names
  // https://github.com/nodejs/node/blob/f3adc11e37b8bfaaa026ea85c1cf22e3a0e29ae9/lib/internal/modules/esm/translators.js#L382-L409
  // for (const e of cjsParsed.reexports) {
  //   output.append(`export * from ${JSON.stringify(e)}';\n`)
  // }

  output.prepend(`const exports = {}; const module = { exports };\n`)
  return { output }
}
