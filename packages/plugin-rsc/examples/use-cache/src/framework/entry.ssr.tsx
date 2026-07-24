import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { RscPayload } from './entry.rsc'

export async function renderHtml(rscStream: ReadableStream<Uint8Array>) {
  const [ssrStream, browserStream] = rscStream.tee()
  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(ssrStream)
    return React.use(payload).root
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent,
  })
  return htmlStream.pipeThrough(injectRSCPayload(browserStream))
}
