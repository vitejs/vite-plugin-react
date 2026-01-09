import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Program, Node } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { analyze } from 'periscopic'

// TODO:
// replacing require("xxx") into import("xxx") affects Vite's resolution.

// Runtime helper to handle CJS/ESM interop when transforming require() to import()
// Only unwrap .default for modules that were transformed by this plugin (marked with __cjs_module_runner_transform)
// This ensures we don't incorrectly unwrap .default on genuine ESM modules
const CJS_INTEROP_HELPER = `function __cjs_interop__(m) { return m.__cjs_module_runner_transform ? m.default : m; }`

export function transformCjsToEsm(
  code: string,
  ast: Program,
  options: { id: string },
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
  // TODO: prepend after shebang
  for (const hoisted of hoistedCodes.reverse()) {
    output.prepend(hoisted)
  }
  if (output.hasChanged()) {
    output.prepend(`${CJS_INTEROP_HELPER}\n`)
  }
  // https://nodejs.org/docs/v22.19.0/api/modules.html#exports-shortcut
  output.prepend(`let exports = {}; const module = { exports };\n`)

  // https://nodejs.org/docs/v22.19.0/api/modules.html#the-module-scope
  // https://github.com/vitest-dev/vitest/blob/965cefc19722a6c899cd1d3decb3cc33e72af696/packages/vite-node/src/client.ts#L548-L554
  const __filename = fileURLToPath(pathToFileURL(options.id).href)
  const __dirname = path.dirname(__filename)
  output.prepend(
    `let __filename = ${JSON.stringify(__filename)}; let __dirname = ${JSON.stringify(__dirname)};\n`,
  )

  // TODO: can we use cjs-module-lexer to properly define named exports?
  // for re-exports, we need to eagerly transform dependencies though.
  // https://github.com/nodejs/node/blob/f3adc11e37b8bfaaa026ea85c1cf22e3a0e29ae9/lib/internal/modules/esm/translators.js#L382-L409
  output.append(`
;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
`)

  return { output }
}
