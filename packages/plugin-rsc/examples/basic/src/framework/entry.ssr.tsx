import {
  createFromReadableStream,
  getClientEntryUrl,
} from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
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

  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    return React.use(payload).root
  }

  const bootstrapScriptContent = `import(${JSON.stringify(getClientEntryUrl())})`
  let htmlStream: ReadableStream<Uint8Array>
  let status: number | undefined
  try {
    htmlStream = await renderToReadableStream(
      <>
        {/*
          https://vite.dev/guide/features.html#content-security-policy-csp
          this isn't needed if `style-src: 'unsafe-inline'` (dev) and `script-src: 'self'`.
          Vite's preload helper reads this meta whenever it inserts links for a
          dynamic import, so the meta has to keep the document's nonce. It's
          rendered outside the RSC payload, where each client navigation would
          replace it with that request's nonce, and entry.browser.tsx renders
          it again with the same nonce.
        */}
        {options.nonce && <meta property="csp-nonce" nonce={options.nonce} />}
        <SsrRoot />
      </>,
      {
        bootstrapScriptContent: options?.debugNojs
          ? undefined
          : bootstrapScriptContent,
        nonce: options?.nonce,
        formState: options?.formState,
      },
    )
  } catch (e) {
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
          (options?.debugNojs ? '' : bootstrapScriptContent),
        nonce: options?.nonce,
      },
    )
  }

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  if (!options?.debugNojs) {
    responseStream = responseStream.pipeThrough(
      injectRSCPayload(rscStream2, {
        nonce: options?.nonce,
      }),
    )
  }

  return { stream: responseStream, status }
}
