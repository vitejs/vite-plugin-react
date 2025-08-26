import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'
import { prerender } from 'react-dom/static.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { RscPayload } from './shared'

export async function renderHtml(
  rscStream: ReadableStream<Uint8Array>,
  options?: {
    ssg?: boolean
  },
) {
  const [rscStream1, rscStream2] = rscStream.tee()

  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    const root = React.use(payload).root
    return root
  }
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')

  let htmlStream: ReadableStream<Uint8Array>
  if (options?.ssg) {
    const prerenderResult = await prerender(<SsrRoot />, {
      bootstrapScriptContent,
    })
    htmlStream = prerenderResult.prelude
  } else {
    htmlStream = await renderToReadableStream(<SsrRoot />, {
      bootstrapScriptContent,
    })
  }

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  responseStream = responseStream.pipeThrough(injectRSCPayload(rscStream2))
  return responseStream
}
