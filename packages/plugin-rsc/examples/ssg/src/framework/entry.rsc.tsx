import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { Root, getStaticPaths } from '../root'
import { RSC_POSTFIX, type RscPayload } from './shared'

export { getStaticPaths }

export default async function handler(request: Request): Promise<Response> {
  let url = new URL(request.url)
  let isRscRequest = false
  if (url.pathname.endsWith(RSC_POSTFIX)) {
    isRscRequest = true
    url.pathname = url.pathname.slice(0, -RSC_POSTFIX.length)
  }

  const rscPayload: RscPayload = { root: <Root url={url} /> }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload)

  if (isRscRequest) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.renderHtml(rscStream)

  return new Response(htmlStream, {
    headers: {
      'content-type': 'text/html;charset=utf-8',
      vary: 'accept',
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

  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.renderHtml(rscStream1, {
    ssg: true,
  })

  return { html: htmlStream, rsc: rscStream2 }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
