import { runtimePublicPath } from '@vitejs/react-common'

const sharedHeader = `
import * as RefreshRuntime from "${runtimePublicPath}";

const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
`.replace(/\n+/g, '')
const functionHeader = `
let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong. " +
      "See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201"
    );
  }

  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg(__SOURCE__);
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}`.replace(/\n+/g, '')

const functionFooter = `
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}`
const sharedFooter = (id: string) => `
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

export function addRefreshWrapper(code: string, id: string): string {
  return (
    sharedHeader +
    functionHeader.replace('__SOURCE__', JSON.stringify(id)) +
    code +
    functionFooter +
    sharedFooter(id)
  )
}

export function addClassComponentRefreshWrapper(
  code: string,
  id: string,
): string {
  return sharedHeader + code + sharedFooter(id)
}
