export const runtimePublicPath = '/@react-refresh'

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshRegCall = '$RefreshReg$('
const refreshSigCall = '$RefreshSig$('

// NOTE: this is exposed publicly via plugin-react
export const preambleCode = `import { injectIntoGlobalHook } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
injectIntoGlobalHook(window);`

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
  const hasReg = code.includes(refreshRegCall)
  const hasSig = code.includes(refreshSigCall)
  const hasClassComponent = reactCompRE.test(code)

  const normalizedMap = map === avoidSourceMapOption ? null : map

  if (!hasReg && !hasSig && !hasClassComponent) {
    return { code, map: normalizedMap }
  }

  const avoidSourceMap = map === avoidSourceMapOption
  const newMap =
    typeof normalizedMap === 'string'
      ? (JSON.parse(normalizedMap) as M)
      : normalizedMap

  let newCode = removeLineBreaksIfNeeded(
    `import * as RefreshRuntime from "${reactRefreshHost}${runtimePublicPath}";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

`,
    avoidSourceMap,
  )
  if (newMap) {
    newMap.mappings = ';;;' + newMap.mappings
  }

  if (hasReg) {
    newCode += removeLineBreaksIfNeeded(
      `let $RefreshReg$, $RefreshSig$;

if (import.meta.hot && !inWebWorker) {
  if (!window.__vite_plugin_react_preamble_installed__) {
    throw new Error("${pluginName} can't detect preamble. Something is wrong.");
  }
  $RefreshReg$ = RefreshRuntime.getRefreshReg(${JSON.stringify(id)});
  $RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}

`,
      avoidSourceMap,
    )
    if (newMap) {
      newMap.mappings = ';'.repeat(10) + newMap.mappings
    }
  } else if (hasSig) {
    newCode += removeLineBreaksIfNeeded(
      `let $RefreshSig$;
if (import.meta.hot && !inWebWorker) {
  $RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
`,
      avoidSourceMap,
    )
    if (newMap) {
      newMap.mappings = ';'.repeat(4) + newMap.mappings
    }
  }

  newCode += code

  if (hasReg || hasClassComponent) {
    newCode += `

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
}`
  }

  return { code: newCode, map: newMap }
}

function removeLineBreaksIfNeeded(code: string, enabled: boolean): string {
  return enabled ? code.replace(/\n/g, '') : code
}
