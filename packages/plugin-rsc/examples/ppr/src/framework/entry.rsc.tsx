import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import { prerender } from '@vitejs/plugin-rsc/rsc/static'
import type { PrerenderResult } from 'react-dom/static'
import { Root, getStaticPaths } from '../root'
import { exportCache, importCache, type CacheData } from './cache'
import {
  runWithPrerenderContext,
  type PrerenderPhase,
} from './prerender-context'
import { parseRenderRequest, type RenderRequest } from './request'
import { stringToStream } from './stream-utils'

export type RscPayload = {
  root: React.ReactNode
  // server action handling omitted for brevity
}

export type PprManifest = {
  rscCache: CacheData
  routes: Record<string, PersistedSsrPrerenderResult>
}

export type PersistedSsrPrerenderResult = {
  // Persisted string representation of react-dom's PrerenderResult.
  prelude: string
  postponed: string
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  const debugShell = import.meta.env.DEV
    ? renderRequest.url.searchParams.get('__ppr_shell')
    : null
  const finalOnlyShell = debugShell === 'final'
  const returnShellOnly = finalOnlyShell || debugShell === 'two-pass'

  // In dev, `?__ppr` exercises the persisted manifest handoff without a build.
  const pprManifest: PprManifest | undefined = import.meta.env.DEV
    ? renderRequest.url.searchParams.has('__ppr')
      ? await generatePprManifest()
      : undefined
    : await loadPprManifest()
  if (pprManifest) {
    importCache(pprManifest.rscCache)
  }

  if (renderRequest.isRsc) {
    return new Response(renderRscStream(renderRequest), {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  let ssrPrerenderResult: PrerenderResult
  if (pprManifest) {
    const persistedResult = pprManifest.routes[renderRequest.url.pathname]
    if (!persistedResult) {
      throw new Error(`PPR route not found: ${renderRequest.url.pathname}`)
    }
    ssrPrerenderResult = reviveSsrPrerenderResult(persistedResult)
  } else {
    ssrPrerenderResult = await prerenderPprRoute(
      renderRequest.request,
      !finalOnlyShell,
    )
  }

  // Dev-only diagnostics expose the captured shell before request-time resume.
  // Comparing `final` with `two-pass` demonstrates why cache discovery and
  // strict shell capture use separate renders.
  if (returnShellOnly) {
    return new Response(ssrPrerenderResult.prelude, {
      headers: { 'content-type': 'text/html;charset=utf-8' },
    })
  }

  // An edge or CDN can stream the static prelude immediately while requesting
  // the resumed stream from a dedicated dynamic backend endpoint, then stitch
  // both into one client response. This demo simplifies that backend request
  // to an in-process renderDynamicPprStream call.
  // https://nextjs.org/docs/app/api-reference/adapters/implementing-ppr-in-an-adapter#2-runtime-flow-serve-cached-shell-and-resume-in-background
  const resumedStreamPromise = renderDynamicPprStream(
    renderRequest,
    ssrPrerenderResult.postponed,
  )
  const htmlStream = stitchPprStreams(
    ssrPrerenderResult.prelude,
    resumedStreamPromise,
  )
  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

function renderRscStream(renderRequest: RenderRequest) {
  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} />,
  }
  return renderToReadableStream(rscPayload)
}

/**
 * Models the dynamic server: render request-time Flight, resume SSR, and send
 * that same Flight payload for browser hydration.
 */
async function renderDynamicPprStream(
  renderRequest: RenderRequest,
  postponed: PrerenderResult['postponed'],
): Promise<ReadableStream<Uint8Array>> {
  if (postponed == null) {
    throw new Error('Expected the PPR render to contain postponed state')
  }
  const rscStream = renderRscStream(renderRequest)
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  return ssrEntryModule.resumeHtml(rscStream, postponed)
}

function stitchPprStreams(
  preludeStream: ReadableStream<Uint8Array>,
  resumedStreamPromise: Promise<ReadableStream<Uint8Array>>,
): ReadableStream<Uint8Array> {
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

/**
 * Produces one route's live React DOM prerender result. The prospective pass
 * fills the shared RSC cache before strict RSC and HTML prerenders capture it.
 */
async function prerenderPprRoute(
  request: Request,
  includeProspectivePass = true,
): Promise<PrerenderResult> {
  const rscPayload: RscPayload = {
    root: <Root url={new URL(request.url)} />,
  }
  // The discarded prospective pass uses a permissive cutoff to discover and
  // fill cache entries while request-time work remains suspended. The final
  // pass starts from a clean React render and uses a strict cutoff that does not
  // wait for new fills, so only work warmed by the first pass enters the shell.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7905-L7917
  // https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/server/app-ppr-fallback-shell-render.ts#L28-L55
  if (includeProspectivePass) {
    const prospective = await prerenderRsc(rscPayload, 'prospective')
    await prospective.prelude.cancel()
  }
  const { prelude } = await prerenderRsc(rscPayload, 'final')
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  return ssrEntryModule.prerenderHtml(prelude)
}

/**
 * Runs either a permissive cache-discovery prerender or a strict shell-capture
 * prerender until its phase-specific readiness condition is reached.
 */
async function prerenderRsc(rscPayload: RscPayload, phase: PrerenderPhase) {
  const controller = new AbortController()
  const { result, ready } = runWithPrerenderContext(phase, () => {
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
  // A fully static render completes first. For a partial render, prospective
  // readiness means all discovered fills settled, while final readiness means
  // the strict shell-capture window elapsed after reaching unfinished work.
  const outcome = await Promise.race([
    result.then(() => 'complete' as const),
    ready.then(() => 'cutoff' as const),
  ])
  if (outcome === 'cutoff') {
    controller.abort(new Error(`RSC ${phase} cutoff`))
  }
  return result
}

// Persistence is a build-only boundary. Development passes the live React
// result directly, while production restores the serialized manifest entry.

async function persistSsrPrerenderResult(
  result: PrerenderResult,
): Promise<PersistedSsrPrerenderResult> {
  return {
    prelude: await new Response(result.prelude).text(),
    postponed: JSON.stringify(result.postponed),
  }
}

function reviveSsrPrerenderResult(
  result: PersistedSsrPrerenderResult,
): PrerenderResult {
  return {
    prelude: stringToStream(result.prelude),
    postponed: JSON.parse(result.postponed),
  }
}

/**
 * Prerenders every static route and serializes both its React DOM result and
 * the shared RSC cache. The build plugin invokes this after all environments
 * build; development invokes the same path for requests containing `?__ppr`.
 */
export async function generatePprManifest(): Promise<PprManifest> {
  const routes: PprManifest['routes'] = {}
  for (const pathname of getStaticPaths()) {
    const result = await prerenderPprRoute(
      new Request(new URL(pathname, 'http://ppr.local')),
    )
    routes[pathname] = await persistSsrPrerenderResult(result)
  }
  return {
    rscCache: await exportCache(),
    routes,
  }
}

// During build, the PPR plugin rewrites this virtual import to the generated
// ESM sidecar so the runtime loads persisted data without filesystem access.
async function loadPprManifest(): Promise<PprManifest> {
  return (await import('virtual:ppr-manifest')).default
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
