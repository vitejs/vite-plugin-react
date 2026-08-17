import type { IncomingMessage } from 'node:http'
import { HEADER_ACTION_ID, URL_POSTFIX } from './request'

type RenderRequest = {
  isRsc: boolean
  isAction: boolean
  actionId?: string
  url: URL
}

export function parseRenderRequest(request: IncomingMessage): RenderRequest {
  const host = request.headers.host ?? 'localhost'
  const url = new URL(request.url ?? '/', `http://${host}`)
  const isAction = request.method === 'POST'
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    const actionId = request.headers[HEADER_ACTION_ID]
    if (Array.isArray(actionId)) {
      throw new Error(`Multiple ${HEADER_ACTION_ID} headers`)
    }
    if (isAction && !actionId) {
      throw new Error('Missing action id header for RSC action request')
    }
    return { isRsc: true, isAction, actionId, url }
  }
  return { isRsc: false, isAction, url }
}

export async function readRequestBody(
  request: IncomingMessage,
): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function requestBodyToFormData(
  body: Buffer,
  contentType: string | undefined,
): Promise<FormData> {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  const request = new Request('http://localhost', {
    method: 'POST',
    headers,
    body: new Uint8Array(body),
  })
  return request.formData()
}
