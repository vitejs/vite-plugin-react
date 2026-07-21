import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import { prerender } from '@vitejs/plugin-rsc/rsc/static'
import type { PrerenderResult } from 'react-dom/static'
import { Root, getStaticPaths } from '../root'
import { exportCache, importCache, type CacheData } from './cache'
import { runWithPrerenderContext } from './prerender-context'
import { parseRenderRequest } from './request'
import { stringToStream } from './stream-utils'

export type RscPayload = {
  root: React.ReactNode
}

export type PprData = {
  cache: CacheData
  // Persisted string representation of react-dom's PrerenderResult.
  prelude: string
  postponed: string
}

export { getStaticPaths }

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  const pprData = import.meta.env.DEV
    ? undefined
    : await loadPprData(renderRequest.url.pathname)
  if (pprData) {
    importCache(pprData.cache)
  }

  if (renderRequest.isRsc) {
    const rscPayload: RscPayload = {
      root: <Root url={renderRequest.url} />,
    }
    return new Response(renderToReadableStream(rscPayload), {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const htmlPprData = pprData ?? (await handlePpr(renderRequest.request))
  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} />,
  }
  const rscStream = renderToReadableStream(rscPayload)
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const prerenderResult: PrerenderResult = {
    prelude: stringToStream(htmlPprData.prelude),
    postponed: JSON.parse(htmlPprData.postponed),
  }
  const htmlStream = await ssrEntryModule.resumeHtml(rscStream, prerenderResult)

  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

export async function handlePpr(request: Request): Promise<PprData> {
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
    cache: await exportCache(),
    prelude: await new Response(result.prelude).text(),
    postponed: JSON.stringify(result.postponed),
  }
}

async function prerenderRsc(rscPayload: RscPayload, phase: 'warmup' | 'final') {
  const controller = new AbortController()
  const { result, ready } = runWithPrerenderContext(() => {
    return prerender(rscPayload, {
      signal: controller.signal,
      onError() {},
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

let manifestPromise: Promise<Record<string, PprData>> | undefined

async function loadPprData(pathname: string): Promise<PprData> {
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
