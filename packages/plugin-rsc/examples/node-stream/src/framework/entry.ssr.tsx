import { PassThrough, type Readable } from 'node:stream'
import {
  createFromNodeStream,
  getClientEntryUrl,
} from '@vitejs/plugin-rsc/ssr.node'
import React from 'react'
import type { ReactFormState } from 'react-dom/client'
import type { RenderToPipeableStreamOptions } from 'react-dom/server'
import { renderToPipeableStream } from 'react-dom/server.node'
import type { RscPayload } from './entry.rsc'
import { injectRSCPayload } from './rsc-html-stream.server.node'

export async function renderHTML(
  rscStream: Readable,
  options: {
    formState?: ReactFormState
    nonce?: string
    debugNojs?: boolean
  },
): Promise<{ stream: Readable; status?: number }> {
  const rscStreamForSsr = new PassThrough()
  const rscStreamForBrowser = options.debugNojs ? undefined : new PassThrough()
  rscStream.pipe(rscStreamForSsr)
  if (rscStreamForBrowser) {
    rscStream.pipe(rscStreamForBrowser)
  }

  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromNodeStream<RscPayload>(rscStreamForSsr)
    return React.use(payload).root
  }

  const bootstrapScriptContent = `import(${JSON.stringify(getClientEntryUrl())})`
  let htmlStream: Readable
  let status: number | undefined
  try {
    htmlStream = await renderToNodeStream(<SsrRoot />, {
      bootstrapScriptContent: options.debugNojs
        ? undefined
        : bootstrapScriptContent,
      nonce: options.nonce,
      formState: options.formState,
    })
  } catch (e) {
    status = 500
    htmlStream = await renderToNodeStream(
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

  if (rscStreamForBrowser) {
    htmlStream = htmlStream.pipe(
      injectRSCPayload(rscStreamForBrowser, { nonce: options.nonce }),
    )
  }

  return { stream: htmlStream, status }
}

function renderToNodeStream(
  node: React.ReactNode,
  options: RenderToPipeableStreamOptions,
): Promise<Readable> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough()
    const stream = renderToPipeableStream(node, {
      ...options,
      onShellReady() {
        stream.pipe(output)
        resolve(output)
      },
      onShellError(error) {
        reject(error)
      },
    })
  })
}
