import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import { renderToReadableStream } from 'react-dom/server.edge'
import { Root } from '../root'
import { setRscFnCaller, type RscFnCaller } from './runtime'

export async function renderHtml() {
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  return renderToReadableStream(<Root />, { bootstrapScriptContent })
}

// SSR resolves RSC functions in-process because it already runs beside the RSC
// environment. Browser calls use HTTP instead.
const callRscFn: RscFnCaller = async (id, args) => {
  const rscEntry = await import.meta.viteRsc.loadModule<
    typeof import('./entry.rsc')
  >('rsc', 'index')
  const stream = await rscEntry.executeRscFn(id, args)
  return createFromReadableStream(stream)
}

setRscFnCaller(callRscFn)
