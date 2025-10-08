import type { Program, Node } from 'estree'
import MagicString from 'magic-string'
import { analyze } from 'periscopic'
import { walk } from 'estree-walker'

// Runtime helper to handle CJS/ESM interop when transforming require() to import()
// Only unwrap .default for modules that were transformed by this plugin (marked with __cjs_module_runner_transform)
// This ensures we don't incorrectly unwrap .default on genuine ESM modules
const CJS_INTEROP_HELPER = `function __cjs_interop__(m) { return m.__cjs_module_runner_transform ? m.default : m; }`

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
          // top-level scope `require` to dynamic import with interop
          // (this allows handling react development/production re-export within top-level if branch)
          output.update(
            node.start,
            node.callee.end,
            '(__cjs_interop__(await import',
          )
          output.appendRight(node.end, '))')
        } else {
          // hoist non top-level `require` to top-level
          const hoisted = `__cjs_to_esm_hoist_${hoistIndex}`
          const importee = code.slice(
            node.arguments[0]!.start,
            node.arguments[0]!.end,
          )
          hoistedCodes.push(
            `const ${hoisted} = __cjs_interop__(await import(${importee}));\n`,
          )
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
  if (output.hasChanged()) {
    output.prepend(`${CJS_INTEROP_HELPER}\n`)
  }
  // https://nodejs.org/docs/v22.19.0/api/modules.html#exports-shortcut
  output.prepend(`let exports = {}; const module = { exports };\n`)
  return { output }
}
