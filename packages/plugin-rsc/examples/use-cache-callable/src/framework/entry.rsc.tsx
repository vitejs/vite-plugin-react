import {
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { Root } from '../root'
import { parseRenderRequest } from './request'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  let returnValue: RscPayload['returnValue']
  let temporaryReferences: unknown
  let status: number | undefined

  if (renderRequest.actionId) {
    temporaryReferences = createTemporaryReferenceSet()
    const args = await decodeReply(await renderRequest.request.text(), {
      temporaryReferences,
    })
    const action = await loadServerAction(renderRequest.actionId)
    try {
      returnValue = { ok: true, data: await action.apply(null, args) }
    } catch (error) {
      returnValue = { ok: false, data: error }
      status = 500
    }
  }

  const payload: RscPayload = {
    root: <Root />,
    returnValue,
  }
  const rscStream = renderToReadableStream<RscPayload>(payload, {
    temporaryReferences,
  })
  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      status,
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.renderHTML(rscStream)
  return new Response(htmlStream, {
    status,
    headers: { 'content-type': 'text/html' },
  })
}

if (import.meta.hot) import.meta.hot.accept()
