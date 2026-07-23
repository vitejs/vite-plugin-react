import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import type { ReactNode } from 'react'
import { Root } from '../root.tsx'
import { parseRenderRequest } from './request.ts'

// This fixture intentionally serializes the React tree itself instead of the
// object-shaped payload used by larger examples. React can recover performance
// debug info from a top-level React element, while arbitrary object wrappers
// may need to preserve React's internal `_debugInfo` manually.
export type RscPayload = ReactNode

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  const payload: RscPayload = <Root url={renderRequest.url} />
  const rscStream = renderToReadableStream<RscPayload>(payload)

  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
      },
    })
  }

  const ssrEntry = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await ssrEntry.renderHTML(rscStream)
  return new Response(htmlStream, {
    headers: {
      'content-type': 'text/html',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
