// TODO: explain
type RenderRequest = {
  type: 'rsc' | 'html'
  action?: string | boolean // action id string for js request
  request: Request
  url: URL
}

const URL_POSTFIX = '_.rsc'
const HEADER_ACTION_ID = 'x-rsc-action'

export function encodeRenderRequest(
  url: URL,
  action?: { id: string; body: BodyInit },
): Request {
  url = new URL(url)
  url.pathname += URL_POSTFIX
  const headers = new Headers()
  if (action) {
    headers.set(HEADER_ACTION_ID, action.id)
  }
  return new Request(url.toString(), {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}

export function decodeRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url)
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    const actionId = request.headers.get(HEADER_ACTION_ID) || undefined
    if (request.method === 'POST' && !actionId) {
      throw new Error('Missing action id header for RSC action request')
    }
    return {
      type: 'rsc',
      action: actionId,
      request: new Request(url.toString(), request), // TODO: undici compat?
      url,
    }
  } else {
    return {
      type: 'html',
      action: request.method === 'POST',
      request,
      url,
    }
  }
}
