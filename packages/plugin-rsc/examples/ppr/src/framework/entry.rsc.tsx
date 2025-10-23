import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { Root } from '../root.tsx'

export type RscPayload = {
  root: React.ReactNode
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const rscPayload: RscPayload = {
    root: <Root url={url} />,
  }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload)

  // Check if client wants RSC stream directly
  const isRscRequest =
    (!request.headers.get('accept')?.includes('text/html') &&
      !url.searchParams.has('__html')) ||
    url.searchParams.has('__rsc')

  if (isRscRequest) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  // Delegate to SSR environment for HTML rendering with PPR
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await ssrEntryModule.renderHTML(rscStream)

  return new Response(htmlStream, {
    headers: {
      'Content-type': 'text/html',
      vary: 'accept',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
