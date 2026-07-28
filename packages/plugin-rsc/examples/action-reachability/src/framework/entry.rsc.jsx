import {
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { Root } from '../root.jsx'
import { parseRequest } from './request.js'

export default { fetch: handler }

async function handler(inputRequest) {
  const parsed = parseRequest(inputRequest)
  let returnValue
  let temporaryReferences

  if (parsed.isAction) {
    if (!parsed.actionId)
      return new Response('Missing action ID', { status: 400 })
    const contentType = parsed.request.headers.get('content-type')
    const body = contentType?.startsWith('multipart/form-data')
      ? await parsed.request.formData()
      : await parsed.request.text()
    temporaryReferences = createTemporaryReferenceSet()
    const args = await decodeReply(body, { temporaryReferences })
    const action = await loadServerAction(parsed.actionId)
    returnValue = await action(...args)
  }

  const rscStream = renderToReadableStream(
    { root: <Root />, returnValue },
    { temporaryReferences },
  )
  if (parsed.isRsc) {
    return new Response(rscStream, {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const ssr = await import.meta.viteRsc.loadModule('ssr', 'index')
  return new Response(await ssr.renderHtml(rscStream), {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}
