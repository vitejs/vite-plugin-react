import {
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { Root } from '../root.tsx'
import { parseRenderRequest } from './request.ts'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  request = renderRequest.request
  let returnValue: RscPayload['returnValue']
  let temporaryReferences: unknown
  let status: number | undefined

  if (renderRequest.isAction && renderRequest.actionId) {
    const contentType = request.headers.get('content-type')
    const body = contentType?.startsWith('multipart/form-data')
      ? await request.formData()
      : await request.text()
    temporaryReferences = createTemporaryReferenceSet()
    const args = await decodeReply(body, { temporaryReferences })
    const action = await loadServerAction(renderRequest.actionId)
    try {
      returnValue = { ok: true, data: await action.apply(null, args) }
    } catch (error) {
      returnValue = { ok: false, data: error }
      status = 500
    }
  }

  const rscStream = renderToReadableStream<RscPayload>(
    { root: <Root />, returnValue },
    { temporaryReferences },
  )
  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      status,
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const ssrEntry = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  return new Response(await ssrEntry.renderHTML(rscStream), {
    status,
    headers: { 'content-type': 'text/html' },
  })
}

if (import.meta.hot) import.meta.hot.accept()
