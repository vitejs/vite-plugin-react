import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import { prerender } from '@vitejs/plugin-rsc/rsc/static'
import { Root } from '../root'
import { runPrerender } from './ppr-context'
import { parseRenderRequest } from './request'
import type { PprData, RscPayload } from './shared'

let manifestPromise: Promise<Record<string, PprData>> | undefined

export function getStaticPaths(): string[] {
  return ['/']
}

export default async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)

  if (renderRequest.isRsc) {
    return new Response(
      renderToReadableStream(
        createPayload(renderRequest.url, new Date().toISOString()),
      ),
      {
        headers: { 'content-type': 'text/x-component;charset=utf-8' },
      },
    )
  }

  const pprData = import.meta.env.DEV
    ? await handlePpr(renderRequest.request)
    : await loadPprData(renderRequest.url.pathname)
  const payload = createPayload(renderRequest.url, pprData.staticTimestamp)
  const rscStream = renderToReadableStream(payload)
  const [rscForSsr, rscForBrowser] = rscStream.tee()
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.resumeHtml(rscForSsr, rscForBrowser, pprData)

  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

export async function handlePpr(request: Request): Promise<PprData> {
  const staticTimestamp = new Date().toISOString()
  const payload = createPayload(new URL(request.url), staticTimestamp)
  const controller = new AbortController()
  const pendingResult = runPrerender(() =>
    prerender(payload, {
      signal: controller.signal,
      onError() {},
    }),
  )
  setTimeout(() => controller.abort(new Error('RSC prerender cutoff')), 0)
  const { prelude } = await pendingResult
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  return {
    ...(await ssr.prerenderHtml(prelude)),
    staticTimestamp,
  }
}

function createPayload(url: URL, staticTimestamp: string): RscPayload {
  return { root: <Root url={url} staticTimestamp={staticTimestamp} /> }
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
