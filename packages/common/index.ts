export const runtimePublicPath = '/@react-refresh'

// NOTE: this is currently exposed publicly via plugin-react
export const preambleCode = `import { injectIntoGlobalHook } from "__BASE__${runtimePublicPath.slice(
  1,
)}"
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`

// NOTE: this is exposed publicly via plugin-react
export const getPreambleCode = (base: string): string =>
  preambleCode.replace('__BASE__', base)
