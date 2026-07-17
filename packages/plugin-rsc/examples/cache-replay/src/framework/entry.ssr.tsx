import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import { cachedInlineContentTitle } from '../cached-inline-content'
import type { RscPayload } from './entry.rsc'

export async function renderHTML(
  rscStream: ReadableStream<Uint8Array>,
  options: {
    formState?: ReactFormState
    nonce?: string
    debugNojs?: boolean
  },
): Promise<{ stream: ReadableStream<Uint8Array>; status?: number }> {
  const [rscStream1, rscStream2] = rscStream.tee()

  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    return React.use(payload).root
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  let htmlStream: ReadableStream<Uint8Array>
  let status: number | undefined
  try {
    htmlStream = await renderToReadableStream(
      <>
        {/* The route module's static metadata becomes the document title on
            every request (React hoists it into <head>). This import is what
            pulls the module through the SSR graph while its component renders
            only in the RSC environment. */}
        <title>{cachedInlineContentTitle}</title>
        <SsrRoot />
      </>,
      {
        bootstrapScriptContent: options.debugNojs
          ? undefined
          : bootstrapScriptContent,
        nonce: options.nonce,
        formState: options.formState,
      },
    )
  } catch {
    status = 500
    htmlStream = await renderToReadableStream(
      <html>
        <body>
          <noscript>Internal Server Error: SSR failed</noscript>
        </body>
      </html>,
      {
        bootstrapScriptContent:
          `self.__NO_HYDRATE=1;` +
          (options.debugNojs ? '' : bootstrapScriptContent),
        nonce: options.nonce,
      },
    )
  }

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  if (!options.debugNojs) {
    responseStream = responseStream.pipeThrough(
      injectRSCPayload(rscStream2, {
        nonce: options.nonce,
      }),
    )
  }

  return { stream: responseStream, status }
}
