import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'

type RscPayload = { root: React.ReactNode }

export async function renderHtml(
  rscStream: ReadableStream<Uint8Array>,
): Promise<ReadableStream<Uint8Array>> {
  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream)
    return React.use(payload).root
  }

  return renderToReadableStream(<SsrRoot />)
}
