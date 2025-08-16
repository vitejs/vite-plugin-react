import * as esModuleLexer from 'es-module-lexer'
import { parseAstAsync } from 'vite'
import { walk } from 'estree-walker'

// https://github.com/vitejs/vite/blob/86d2e8be50be535494734f9f5f5236c61626b308/packages/vite/src/node/plugins/importMetaGlob.ts#L113
const importGlobRE = /\bimport\.meta\.glob(?:<\w+>)?\s*\(/g

export async function transformScanBuildStrip(code: string): Promise<string> {
  const [imports] = esModuleLexer.parse(code)
  let output = imports
    .map((e) => e.n && `import ${JSON.stringify(e.n)};\n`)
    .filter(Boolean)
    .join('')

  // preserve import.meta.glob for rolldown-vite
  // https://github.com/vitejs/rolldown-vite/issues/373
  if (importGlobRE.test(code)) {
    const ast = await parseAstAsync(code)
    walk(ast, {
      enter(node) {
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'MetaProperty' &&
          node.callee.object.meta.type === 'Identifier' &&
          node.callee.object.meta.name === 'import' &&
          node.callee.object.property.type === 'Identifier' &&
          node.callee.object.property.name === 'meta' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'glob'
        ) {
          const importMetaGlob = code.slice(node.start, node.end)
          output += `console.log(${importMetaGlob});\n`
        }
      },
    })
    output += ''
  }

  return output
}
