import {
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import type React from 'react'
import { Root } from '../root'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const isRsc = url.pathname.endsWith('_.rsc')
  if (isRsc) url.pathname = url.pathname.slice(0, -'_.rsc'.length)

  let returnValue: RscPayload['returnValue']
  let temporaryReferences: unknown
  if (request.method === 'POST') {
    const actionId = request.headers.get('x-rsc-action')
    if (!actionId) return new Response('Missing action id', { status: 400 })
    const contentType = request.headers.get('content-type')
    const body = contentType?.startsWith('multipart/form-data')
      ? await request.formData()
      : await request.text()
    temporaryReferences = createTemporaryReferenceSet()
    const args = await decodeReply(body, { temporaryReferences })
    const action = await loadServerAction(actionId)
    try {
      returnValue = { ok: true, data: await action.apply(null, args) }
    } catch (error) {
      returnValue = { ok: false, data: error }
    }
  }

  const payload: RscPayload = { root: <Root />, returnValue }
  const rscStream = renderToReadableStream(payload, { temporaryReferences })
  if (isRsc) {
    return new Response(rscStream, {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  return new Response(await ssr.renderHtml(rscStream), {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

if (import.meta.hot) import.meta.hot.accept()
