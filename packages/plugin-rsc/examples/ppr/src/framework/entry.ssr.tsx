import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { resume } from 'react-dom/server.edge'
import { prerender } from 'react-dom/static.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { PprData, RscPayload } from './shared'

const payloadCache = new WeakMap<
  ReadableStream<Uint8Array>,
  Promise<RscPayload>
>()

export async function prerenderHtml(
  rscStream: ReadableStream<Uint8Array>,
): Promise<PprData> {
  const controller = new AbortController()
  const pendingResult = prerender(<SsrRoot rscStream={keepOpen(rscStream)} />, {
    signal: controller.signal,
    bootstrapScriptContent:
      await import.meta.viteRsc.loadBootstrapScriptContent('index'),
    onError() {},
  })
  // Allow the SSR environment to load client-reference modules and reach the
  // unresolved Flight segment before cutting off this minimal demo prerender.
  setTimeout(() => controller.abort(new Error('HTML prerender cutoff')), 50)
  const result = await pendingResult
  if (result.postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  return {
    html: await new Response(result.prelude).text(),
    postponed: JSON.stringify(result.postponed),
  }
}

export async function resumeHtml(
  rscForSsr: ReadableStream<Uint8Array>,
  rscForBrowser: ReadableStream<Uint8Array>,
  pprData: PprData,
): Promise<ReadableStream<Uint8Array>> {
  const resumed = await resume(
    <SsrRoot rscStream={rscForSsr} />,
    JSON.parse(pprData.postponed),
  )
  const html = resumed.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(pprData.html))
      },
    }),
  )
  return html.pipeThrough(injectRSCPayload(rscForBrowser))
}

function keepOpen(
  stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      flush() {
        return new Promise<void>(() => {})
      },
    }),
  )
}

function SsrRoot({ rscStream }: { rscStream: ReadableStream<Uint8Array> }) {
  let payload = payloadCache.get(rscStream)
  if (!payload) {
    payload = createFromReadableStream<RscPayload>(rscStream)
    payloadCache.set(rscStream, payload)
  }
  return React.use(payload).root
}
