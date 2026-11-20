import { AsyncLocalStorage } from 'node:async_hooks'
import {
  createFromReadableStream,
  getClientEntryUrl,
  setResourceOptionsCallback,
} from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { RscPayload } from './entry.rsc'

// client references' preloads and stylesheets are added during the SSR render
// below, so the framework provides their nonce through its own request-scoped storage.
const nonceStorage = new AsyncLocalStorage<string | undefined>()
setResourceOptionsCallback(() => ({ nonce: nonceStorage.getStore() }))

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
    htmlStream = await nonceStorage.run(options?.nonce, () =>
      renderToReadableStream(
        <>
          {/*
            Vite's preload helper gives the links it inserts for dynamic imports
            the nonce of this meta, so the meta has to keep the document's nonce
            (https://vite.dev/guide/features.html#content-security-policy-csp).
            It's rendered only with the HTML document. In the RSC payload, every
            client navigation would render it again with a new nonce.
            entry.browser.tsx renders the meta again with the same nonce. A CSP
            with `script-src 'self'` and `style-src 'unsafe-inline'` (enough in
            dev) doesn't need it.
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
      ),
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
