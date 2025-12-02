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
): Promise<{ stream: ReadableStream<Uint8Array>; status?: number }> {
  const [rscStream1, rscStream2] = rscStream.tee()

  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    const root = React.use(payload).root
    return root
  }
  const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent('index')

  let htmlStream: ReadableStream<Uint8Array>
  let status: number | undefined
  if (options?.ssg) {
    // for static site generation, let errors throw to fail the build
    const prerenderResult = await prerender(<SsrRoot />, {
      bootstrapScriptContent,
    })
    htmlStream = prerenderResult.prelude
  } else {
    // for regular SSR, catch errors and fallback to CSR
    try {
      htmlStream = await renderToReadableStream(<SsrRoot />, {
        bootstrapScriptContent,
      })
    } catch (e) {
      // fallback to render an empty shell and run pure CSR on browser,
      // which can replay server component error and trigger error boundary.
      status = 500
      htmlStream = await renderToReadableStream(
        <html>
          <body>
            <noscript>Internal Server Error: SSR failed</noscript>
          </body>
        </html>,
        {
          bootstrapScriptContent: `self.__NO_HYDRATE=1;` + bootstrapScriptContent,
        },
      )
    }
  }

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  responseStream = responseStream.pipeThrough(injectRSCPayload(rscStream2))
  return { stream: responseStream, status }
}
