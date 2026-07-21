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
  const ssrRoot = createSsrRoot(preventStreamClose(rscStream))
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  const controller = new AbortController()
  const pendingResult = prerender(ssrRoot, {
    bootstrapScriptContent,
    signal: controller.signal,
    // TODO: Add digest-based error reporting as part of the dedicated error
    // handling example: https://github.com/vitejs/vite-plugin-react/issues/795
    onError(error) {
      if (!controller.signal.aborted) {
        console.error(error)
      }
    },
  })
  // Allow shell-relevant SSR work, including client-reference module loading,
  // to settle and reach the unresolved Flight segment before cutting off.
  // TODO: Contrast this fixed delay with Next.js's tracked module warmup and
  // controlled final prerender cutoff.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8127-L8129
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8220-L8227
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8580-L8656
  setTimeout(() => controller.abort(new Error('HTML prerender cutoff')), 50)
  const result = await pendingResult

  // This demo requires a dynamic HTML hole so every prerender exercises resume.
  // A framework should instead classify and persist all valid outcomes: dynamic
  // HTML with postponed state, dynamic data only, or a fully static result.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8886-L8917
  if (result.postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  return result
}

export async function resumeHtml(
  rscStream: ReadableStream<Uint8Array>,
  prerenderResult: PrerenderResult,
): Promise<ReadableStream<Uint8Array>> {
  // Validate that persisted input still represents the dynamic HTML outcome
  // selected during prerendering.
  if (prerenderResult.postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  const [rscForSsr, rscForBrowser] = rscStream.tee()
  const ssrRoot = createSsrRoot(rscForSsr)
  const resumed = await resume(ssrRoot, prerenderResult.postponed)
  const html = concatStreams(prerenderResult.prelude, resumed)
  return html.pipeThrough(injectRSCPayload(rscForBrowser))
}

function createSsrRoot(rscStream: ReadableStream<Uint8Array>) {
  let payload: Promise<RscPayload>

  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream)
    return React.use(payload).root
  }

  return <SsrRoot />
}
