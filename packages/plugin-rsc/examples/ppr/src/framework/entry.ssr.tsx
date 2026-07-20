import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { resume } from 'react-dom/server.edge'
import type { PrerenderResult } from 'react-dom/static'
import { prerender } from 'react-dom/static.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { RscPayload } from './entry.rsc'
import { concatStreams, preventStreamClose } from './stream-utils'

export async function prerenderHtml(
  rscStream: ReadableStream<Uint8Array>,
): Promise<PrerenderResult> {
  const ssrRoot = <SsrRoot rscStream={preventStreamClose(rscStream)} />
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const controller = new AbortController()
  const pendingResult = prerender(ssrRoot, {
    bootstrapScriptContent,
    signal: controller.signal,
    onError() {},
  })
  // Allow the SSR environment to load client-reference modules and reach the
  // unresolved Flight segment before cutting off this minimal demo prerender.
  setTimeout(() => controller.abort(new Error('HTML prerender cutoff')), 50)
  const result = await pendingResult
  if (result.postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  return result
}

export async function resumeHtml(
  rscStream: ReadableStream<Uint8Array>,
  prerenderResult: PrerenderResult,
): Promise<ReadableStream<Uint8Array>> {
  if (prerenderResult.postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  const [rscForSsr, rscForBrowser] = rscStream.tee()
  const ssrRoot = <SsrRoot rscStream={rscForSsr} />
  const resumed = await resume(ssrRoot, prerenderResult.postponed)
  const html = concatStreams(prerenderResult.prelude, resumed)
  return html.pipeThrough(injectRSCPayload(rscForBrowser))
}

const payloadCache = new WeakMap<
  ReadableStream<Uint8Array>,
  Promise<RscPayload>
>()

function SsrRoot({ rscStream }: { rscStream: ReadableStream<Uint8Array> }) {
  let payload = payloadCache.get(rscStream)
  if (!payload) {
    payload = createFromReadableStream<RscPayload>(rscStream)
    payloadCache.set(rscStream, payload)
  }
  return React.use(payload).root
}
