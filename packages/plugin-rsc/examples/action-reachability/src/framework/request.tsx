const URL_POSTFIX = '_.rsc'
const HEADER_ACTION_ID = 'x-rsc-action'
const HEADER_RENDER_URL = 'x-rsc-render-url'

export type RenderRequest = {
  isRsc: boolean
  isAction: boolean
  actionId?: string
  request: Request
  renderUrl: URL
  url: URL
}

export function createRscRenderRequest(
  urlString: string,
  action?: { id: string; body: BodyInit },
  options?: { headers?: HeadersInit; renderUrl?: URL },
): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  const headers = new Headers(options?.headers)
  if (action) {
    headers.set(HEADER_ACTION_ID, action.id)
  }
  if (options?.renderUrl) {
    headers.set(HEADER_RENDER_URL, options.renderUrl.href)
  }
  return new Request(url.toString(), {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}

export function parseRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url)
  const isAction = request.method === 'POST'
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    const renderUrl = new URL(request.headers.get(HEADER_RENDER_URL) ?? url)
    const actionId = request.headers.get(HEADER_ACTION_ID) || undefined
    if (request.method === 'POST' && !actionId) {
      throw new Error('Missing action id header for RSC action request')
    }
    return {
      isRsc: true,
      isAction,
      actionId,
      request: new Request(url, request),
      renderUrl,
      url,
    }
  } else {
    const renderUrl = new URL(request.headers.get(HEADER_RENDER_URL) ?? url)
    return {
      isRsc: false,
      isAction,
      request,
      renderUrl,
      url,
    }
  }
}
