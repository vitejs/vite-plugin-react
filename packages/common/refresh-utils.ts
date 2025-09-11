export const runtimePublicPath = '/@react-refresh'

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshContentRE = /\$RefreshReg\$\(/

// NOTE: this is exposed publicly via plugin-react
export const preambleCode = `import { injectIntoGlobalHook } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`

export const getPreambleCode = (base: string): string =>
  preambleCode.replace('__BASE__', base)

export const avoidSourceMapOption = Symbol()

export function addRefreshWrapper<M extends { mappings: string }>(
  code: string,
  map: M | string | typeof avoidSourceMapOption,
  pluginName: string,
  id: string,
  reactRefreshHost = '',
): { code: string; map: M | null | string } {
  const hasRefresh = refreshContentRE.test(code)
  const onlyReactComp = !hasRefresh && reactCompRE.test(code)
  const normalizedMap = map === avoidSourceMapOption ? null : map

  if (!hasRefresh && !onlyReactComp) return { code, map: normalizedMap }

  const newMap =
    typeof normalizedMap === 'string'
      ? (JSON.parse(normalizedMap) as M)
      : normalizedMap

  let newCode = code

  newCode += `

import * as RefreshRuntime from "${reactRefreshHost}${runtimePublicPath}";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "${pluginName} can't detect preamble. Something is wrong."
    );
  }

  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh(${JSON.stringify(
      id,
    )}, currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate(${JSON.stringify(
        id,
      )}, currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
`

  if (hasRefresh) {
    const refreshCode = `
function $RefreshReg$(type, id) { return RefreshRuntime.getRefreshReg(${JSON.stringify(id)})(type, id) }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }
`
    newCode += refreshCode
  }

  return { code: newCode, map: newMap }
}
