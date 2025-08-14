import * as ReactClient from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import * as ReactDomServer from 'react-dom/server.edge'
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
    payload ??= ReactClient.createFromReadableStream<RscPayload>(rscStream1)
    const root = React.use(payload).root
    return root
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')

  const htmlStream = await ReactDomServer.renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent,
  })
  if (options?.ssg) {
    await htmlStream.allReady
  }

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  responseStream = responseStream.pipeThrough(injectRSCPayload(rscStream2))
  return responseStream
}
