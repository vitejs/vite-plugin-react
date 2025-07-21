import { injectRscStreamToHtml } from '@vitejs/plugin-rsc/rsc-html-stream/ssr' // helper API
import * as ReactClient from '@vitejs/plugin-rsc/ssr' // RSC API
import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import * as ReactDOMServer from 'react-dom/server.edge'
import type { RscPayload } from './entry.rsc'

export async function renderHTML(
  rscStream: ReadableStream<Uint8Array>,
  options: {
    formState?: ReactFormState
    nonce?: string
    debugNojs?: boolean
  },
) {
  // duplicate one RSC stream into two.
  // - one for SSR (ReactClient.createFromReadableStream below)
  // - another for browser hydration payload by injecting <script>...FLIGHT_DATA...</script>.
  const [rscStream1, rscStream2] = rscStream.tee()

  // deserialize RSC stream back to React VDOM
  let payload: Promise<RscPayload>
  function SsrRoot() {
    // deserialization needs to be kicked off inside ReactDOMServer context
    // for ReactDomServer preinit/preloading to work
    payload ??= ReactClient.createFromReadableStream<RscPayload>(rscStream1)
    return React.use(payload).root
  }

  // render html (traditional SSR)
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await ReactDOMServer.renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent: options?.debugNojs
      ? undefined
      : bootstrapScriptContent,
    nonce: options?.nonce,
    // no types
    ...{ formState: options?.formState },
  })

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  if (!options?.debugNojs) {
    // initial RSC stream is injected in HTML stream as <script>...FLIGHT_DATA...</script>
    responseStream = responseStream.pipeThrough(
      injectRscStreamToHtml(rscStream2, {
        nonce: options?.nonce,
      }),
    )
  }

  return responseStream
}
