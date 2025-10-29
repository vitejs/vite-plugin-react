import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
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
) {
  const [rscStream1, rscStream2] = rscStream.tee()

  let payload: Promise<RscPayload>
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    return <FixSsrThenable>{React.use(payload).root}</FixSsrThenable>
  }

  function FixSsrThenable(props: React.PropsWithChildren) {
    return props.children
  }

  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const htmlStream = await renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent: options?.debugNojs
      ? undefined
      : bootstrapScriptContent,
    nonce: options?.nonce,
    formState: options?.formState,
  })

  let responseStream: ReadableStream<Uint8Array> = htmlStream
  if (!options?.debugNojs) {
    responseStream = responseStream.pipeThrough(
      injectRSCPayload(rscStream2, {
        nonce: options?.nonce,
      }),
    )
  }

  return responseStream
}
