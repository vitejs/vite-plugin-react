import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import { prerender } from '@vitejs/plugin-rsc/rsc/static'
import type { PrerenderResult } from 'react-dom/static'
import { Root } from '../root'
import { runPrerender } from './ppr-context'
import { parseRenderRequest } from './request'
import type { PprData } from './shared'
import { stringToStream } from './stream-utils'

export type RscPayload = {
  root: React.ReactNode
}

let manifestPromise: Promise<Record<string, PprData>> | undefined

export function getStaticPaths(): string[] {
  return ['/']
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)

  if (renderRequest.isRsc) {
    const rscPayload: RscPayload = {
      root: (
        <Root url={renderRequest.url} timestamp={new Date().toISOString()} />
      ),
    }
    return new Response(renderToReadableStream(rscPayload), {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const pprData = import.meta.env.DEV
    ? await handlePpr(renderRequest.request)
    : await loadPprData(renderRequest.url.pathname)
  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} timestamp={pprData.staticTimestamp} />,
  }
  const rscStream = renderToReadableStream(rscPayload)
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const prerenderResult: PrerenderResult = {
    prelude: stringToStream(pprData.html),
    postponed: JSON.parse(pprData.postponed),
  }
  const htmlStream = await ssrEntryModule.resumeHtml(rscStream, prerenderResult)

  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

export async function handlePpr(request: Request): Promise<PprData> {
  const timestamp = new Date().toISOString()
  const rscPayload: RscPayload = {
    root: <Root url={new URL(request.url)} timestamp={timestamp} />,
  }
  const controller = new AbortController()
  const pendingResult = runPrerender(() =>
    prerender(rscPayload, {
      signal: controller.signal,
      onError() {},
    }),
  )
  setTimeout(() => controller.abort(new Error('RSC prerender cutoff')), 0)
  const { prelude } = await pendingResult
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const result = await ssrEntryModule.prerenderHtml(prelude)
  return {
    html: await new Response(result.prelude).text(),
    postponed: JSON.stringify(result.postponed),
    staticTimestamp: timestamp,
  }
}

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
