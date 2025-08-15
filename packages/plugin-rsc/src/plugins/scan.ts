import * as esModuleLexer from 'es-module-lexer'

export function scanBuildStrip(code: string): string {
  // During scan build, we strip all code but imports to only discover client/server references.
  const [imports] = esModuleLexer.parse(code)
  let output = imports
    .map((e) => {
      if (e.n) {
        return `import ${JSON.stringify(e.n)};\n`
      }
      // TODO
      // keep also import.meta.glob for rolldown-vite
      // https://github.com/vitejs/rolldown-vite/issues/373
      if (e.t === esModuleLexer.ImportType.ImportMeta) {
      }
    })
    .filter(Boolean)
    .join('')
  return output
}
