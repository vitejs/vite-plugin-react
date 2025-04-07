export const runtimePublicPath = '/@react-refresh'

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

// NOTE: this is exposed publicly via plugin-react
export const preambleCode = `import { injectIntoGlobalHook } from "__BASE__${runtimePublicPath.slice(
  1,
)}"
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`

export const getPreambleCode = (base: string): string =>
  preambleCode.replace('__BASE__', base)

export function addRefreshWrapper<M extends { mappings: string } | undefined>(
  code: string,
  map: M | string,
  pluginName: string,
  id: string,
): { code: string; map: M | string } {
  const hasRefresh = refreshContentRE.test(code)
  const onlyReactComp = !hasRefresh && reactCompRE.test(code)
  if (!hasRefresh && !onlyReactComp) return { code, map }

  const newMap = typeof map === 'string' ? (JSON.parse(map) as M) : map
  let newCode = code
  if (hasRefresh) {
    newCode = `let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "${pluginName} can't detect preamble. Something is wrong."
    );
  }

  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg(${JSON.stringify(id)});
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}

${newCode}

if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
`
    if (newMap) {
      newMap.mappings = ';'.repeat(17) + newMap.mappings
    }
  }

  newCode = `import * as RefreshRuntime from "${runtimePublicPath}";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

${newCode}

if (import.meta.hot && !inWebWorker) {
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
  if (newMap) {
    newMap.mappings = ';;;' + newMap.mappings
  }

  return { code: newCode, map: newMap }
}
