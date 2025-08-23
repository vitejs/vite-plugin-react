import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import ReactDomServer from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import { createFromReadableStream } from '../ssr'
import type { RscPayload } from './rsc'

/**
 * @deprecated Use `@vitejs/plugin-rsc/ssr` API instead.
 */
export async function renderHtml(
  rscStream: ReadableStream<Uint8Array>,
  options?: {
    formState?: ReactFormState
    nonce?: string
    debugNoJs?: boolean
  },
): Promise<Response> {
  const [rscStream1, rscStream2] = rscStream.tee()

  // flight deserialization needs to be kicked off inside SSR context
  // for ReactDomServer preinit/preloading to work
  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1, {
      nonce: options?.nonce,
    })
    const root = React.use(payload).root
    return root
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await ReactDomServer.renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent: options?.debugNoJs
      ? undefined
      : bootstrapScriptContent,
    nonce: options?.nonce,
    // no types
    ...{ formState: options?.formState },
  })

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  if (!options?.debugNoJs) {
    responseStream = responseStream.pipeThrough(
      injectRSCPayload(rscStream2, {
        nonce: options?.nonce,
      }),
    )
  }

  return new Response(responseStream, {
    headers: {
      'content-type': 'text/html;charset=utf-8',
      vary: 'accept',
    },
  })
}
