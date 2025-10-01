import type { Plugin } from 'vite'
import { exactRegex } from '@rolldown/pluginutils'

export const runtimePublicPath = '/@react-refresh'

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshContentRE = /\$RefreshReg\$\(/

// NOTE: this is exposed publicly via plugin-react
export const preambleCode = `import { injectIntoGlobalHook } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
if (!window.__vite_plugin_react_preamble_installed__) {
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
}
window.__vite_plugin_react_preamble_installed__ = true;
`

export const getPreambleCode = (base: string): string =>
  preambleCode.replace('__BASE__', base)

export function addRefreshWrapper(
  code: string,
  pluginName: string,
  id: string,
  reactRefreshHost = '',
): string | undefined {
  const hasRefresh = refreshContentRE.test(code)
  const onlyReactComp = !hasRefresh && reactCompRE.test(code)

  if (!hasRefresh && !onlyReactComp) return undefined

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
    newCode += `function $RefreshReg$(type, id) { return RefreshRuntime.register(type, ${JSON.stringify(id)} + ' ' + id) }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }
`
  }

  return newCode
}

export function virtualPreamblePlugin({
  isEnabled,
}: {
  isEnabled: () => boolean
}): Plugin {
  const VIRTUAL_NAME = 'virtual:@vitejs/plugin-react/preamble'
  return {
    name: 'vite:react-virtual-preamble',
    apply: 'serve',
    resolveId: {
      order: 'pre',
      filter: { id: exactRegex(VIRTUAL_NAME) },
      handler(source) {
        if (source === VIRTUAL_NAME) {
          return '\0' + source
        }
      },
    },
    load: {
      filter: { id: exactRegex('\0' + VIRTUAL_NAME) },
      handler(id) {
        if (id === '\0' + VIRTUAL_NAME) {
          if (isEnabled()) {
            // vite dev import analysis can rewrite base
            return preambleCode.replace('__BASE__', '/')
          }
          return ''
        }
      },
    },
    transform: {
      filter: { code: /__REACT_DEVTOOLS_GLOBAL_HOOK__/ },
      handler(code, _id, options) {
        if (options?.ssr) return

        // this is expected to be either `react` or `react-dom/client`.
        // both are optimized to be esm during dev.
        if (isEnabled() && code.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
          return `import ${JSON.stringify(VIRTUAL_NAME)};` + code
        }
      },
    },
  }
}
