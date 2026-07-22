import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React, { type ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'

export async function renderHTML(
  rscStream: ReadableStream<Uint8Array>,
): Promise<ReadableStream<Uint8Array>> {
  const [ssrStream, browserStream] = rscStream.tee()
  let payload: Promise<ReactNode> | undefined

  function SsrRoot() {
    payload ??= createFromReadableStream<ReactNode>(ssrStream)
    return React.use(payload)
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent,
  })
  return htmlStream.pipeThrough(injectRSCPayload(browserStream))
}
