import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import { prerender } from '@vitejs/plugin-rsc/rsc/static'
import type { PrerenderResult } from 'react-dom/static'
import { Root, getStaticPaths } from '../root'
import { exportCache, importCache, type CacheData } from './cache'
import { runWithPrerenderContext } from './prerender-context'
import { parseRenderRequest, type RenderRequest } from './request'
import { stringToStream } from './stream-utils'

export type RscPayload = {
  root: React.ReactNode
  // server action handling omitted for brevity
}

export type PprManifestEntry = {
  rscCache: CacheData
  ssrPrerenderResult: PersistedSsrPrerenderResult
}

export type PersistedSsrPrerenderResult = {
  // Persisted string representation of react-dom's PrerenderResult.
  prelude: string
  postponed: string
}

export { getStaticPaths }

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  // TODO: Add a dev switch that loads persisted PPR data so this production
  // handoff can be covered without running a build.
  const pprEntry = import.meta.env.DEV
    ? undefined
    : await loadPprManifestEntry(renderRequest.url.pathname)
  if (pprEntry) {
    importCache(pprEntry.rscCache)
  }

  if (renderRequest.isRsc) {
    return new Response(renderRscStream(renderRequest), {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const ssrPrerenderResult =
    pprEntry?.ssrPrerenderResult ??
    (await handlePpr(renderRequest.request)).ssrPrerenderResult
  return new Response(renderPprStream(renderRequest, ssrPrerenderResult), {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

function renderRscStream(renderRequest: RenderRequest) {
  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} />,
  }
  return renderToReadableStream(rscPayload)
}

function renderPprStream(
  renderRequest: RenderRequest,
  ssrPrerenderResult: PersistedSsrPrerenderResult,
): ReadableStream<Uint8Array> {
  const postponed: PrerenderResult['postponed'] = JSON.parse(
    ssrPrerenderResult.postponed,
  )
  // Validate that persisted input still represents the dynamic HTML outcome
  // selected during prerendering.
  if (postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }

  async function getResumedStream() {
    const rscStream = renderRscStream(renderRequest)
    const ssrEntryModule = await import.meta.viteRsc.loadModule<
      typeof import('./entry.ssr')
    >('ssr', 'index')
    return ssrEntryModule.resumeHtml(rscStream, postponed!)
  }

  // The persisted prelude can flow while the resumed stream is prepared.
  const resumedStreamPromise = getResumedStream()
  const preludeStream = stringToStream(ssrPrerenderResult.prelude)
  return preludeStream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      async flush(controller) {
        const resumedStream = await resumedStreamPromise
        await resumedStream.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk)
            },
          }),
        )
      },
    }),
  )
}

export async function handlePpr(request: Request): Promise<PprManifestEntry> {
  const rscPayload: RscPayload = {
    root: <Root url={new URL(request.url)} />,
  }
  // TODO: Document the production prior art for warming caches in a discarded
  // RSC pass before restarting the final prerender.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7905-L7917
  // https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/server/app-ppr-fallback-shell-render.ts#L28-L55
  const warmup = await prerenderRsc(rscPayload, 'warmup')
  await warmup.prelude.cancel()
  const { prelude } = await prerenderRsc(rscPayload, 'final')
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const result = await ssrEntryModule.prerenderHtml(prelude)
  return {
    rscCache: await exportCache(),
    ssrPrerenderResult: {
      prelude: await new Response(result.prelude).text(),
      postponed: JSON.stringify(result.postponed),
    },
  }
}

async function prerenderRsc(rscPayload: RscPayload, phase: 'warmup' | 'final') {
  const controller = new AbortController()
  const { result, ready } = runWithPrerenderContext(() => {
    return prerender(rscPayload, {
      signal: controller.signal,
      // TODO: Add digest-based error reporting as part of the dedicated error
      // handling example: https://github.com/vitejs/vite-plugin-react/issues/795
      onError(error) {
        if (!controller.signal.aborted) {
          console.error(error)
        }
      },
    })
  })
  const outcome = await Promise.race([
    result.then(() => 'complete' as const),
    ready.then(() => 'cutoff' as const),
  ])
  if (outcome === 'cutoff') {
    controller.abort(new Error(`RSC ${phase} cutoff`))
  }
  return result
}

let manifestPromise: Promise<Record<string, PprManifestEntry>> | undefined

async function loadPprManifestEntry(
  pathname: string,
): Promise<PprManifestEntry> {
  manifestPromise ??= readFile(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'ppr-manifest.json',
    ),
    'utf8',
  ).then((data) => JSON.parse(data))
  const data = (await manifestPromise)[pathname]
  if (!data) {
    throw new Error(`PPR route not found: ${pathname}`)
  }
  return data
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
