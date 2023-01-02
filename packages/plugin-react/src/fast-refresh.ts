import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

export const runtimePublicPath = '/@react-refresh'

const _require = createRequire(import.meta.url)
const reactRefreshDir = path.dirname(
  _require.resolve('react-refresh/package.json'),
)
const runtimeFilePath = path.join(
  reactRefreshDir,
  'cjs/react-refresh-runtime.development.js',
)

export const runtimeCode = `
const exports = {}
${fs.readFileSync(runtimeFilePath, 'utf-8')}
${fs.readFileSync(_require.resolve('./refreshUtils.js'), 'utf-8')}
export default exports
`

export const preambleCode = `
import RefreshRuntime from "__BASE__${runtimePublicPath.slice(1)}"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
`

const header = `
import RefreshRuntime from "${runtimePublicPath}";

let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot) {
  if (!window.__vite_plugin_react_preamble_installed__) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong. " +
      "See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201"
    );
  }

  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    RefreshRuntime.register(type, __SOURCE__ + " " + id)
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}`.replace(/\n+/g, '')

const footer = `
if (import.meta.hot) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;

  import(/* @vite-ignore */ import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh(__SOURCE__, currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate(currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}`

export function addRefreshWrapper(code: string, id: string): string {
  return (
    header.replace('__SOURCE__', JSON.stringify(id)) +
    code +
    footer.replace('__SOURCE__', JSON.stringify(id))
  )
}
