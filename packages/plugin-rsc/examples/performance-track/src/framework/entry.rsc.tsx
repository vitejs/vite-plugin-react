import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'
import type { ReactNode } from 'react'
import { Root } from '../root.tsx'
import { parseRenderRequest } from './request.ts'

export type RscPayload = {
  root: ReactNode
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  const payload: RscPayload = {
    root: <Root url={renderRequest.url} />,
  }
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
