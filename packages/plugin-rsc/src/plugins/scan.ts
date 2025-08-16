import * as esModuleLexer from 'es-module-lexer'

// https://github.com/vitejs/vite/blob/86d2e8be50be535494734f9f5f5236c61626b308/packages/vite/src/node/plugins/importMetaGlob.ts#L113
const importGlobRE = /\bimport\.meta\.glob(?:<\w+>)?\s*\(/g

export function transformScanBuildStrip(code: string): string | undefined {
  // bail out if import.meta.glob
  // https://github.com/vitejs/rolldown-vite/issues/373
  if (importGlobRE.test(code)) return

  const [imports] = esModuleLexer.parse(code)
  let output = imports
    .map((e) => e.n && `import ${JSON.stringify(e.n)};\n`)
    .filter(Boolean)
    .join('')
  output += 'module.exports = {};\n'

  return output
}
