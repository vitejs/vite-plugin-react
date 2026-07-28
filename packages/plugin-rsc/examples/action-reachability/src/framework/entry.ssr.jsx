import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import { use } from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'

export async function renderHtml(rscStream) {
  const [renderStream, payloadStream] = rscStream.tee()
  const payload = createFromReadableStream(renderStream)
  function SsrRoot() {
    return use(payload).root
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent,
  })
  return htmlStream.pipeThrough(injectRSCPayload(payloadStream))
}
