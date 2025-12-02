import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { Root, getStaticPaths } from '../root'
import { parseRenderRequest } from './request'
import type { RscPayload } from './shared'

export { getStaticPaths }

export default async function handler(request: Request): Promise<Response> {
  // differentiate RSC and SSR request
  const renderRequest = parseRenderRequest(request)

  const rscPayload: RscPayload = { root: <Root url={renderRequest.url} /> }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload)

  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
      },
    })
  }

  const ssr = await import.meta.viteRsc.loadModule<typeof import('./entry.ssr')>('ssr', 'index')
  const ssrResult = await ssr.renderHtml(rscStream)

  return new Response(ssrResult.stream, {
    status: ssrResult.status,
    headers: {
      'content-type': 'text/html;charset=utf-8',
    },
  })
}

// return both rsc and html streams at once for ssg
export async function handleSsg(request: Request): Promise<{
  html: ReadableStream<Uint8Array>
  rsc: ReadableStream<Uint8Array>
}> {
  const url = new URL(request.url)
  const rscPayload: RscPayload = { root: <Root url={url} /> }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload)
  const [rscStream1, rscStream2] = rscStream.tee()

  const ssr = await import.meta.viteRsc.loadModule<typeof import('./entry.ssr')>('ssr', 'index')
  const ssrResult = await ssr.renderHtml(rscStream1, {
    ssg: true,
  })

  return { html: ssrResult.stream, rsc: rscStream2 }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
