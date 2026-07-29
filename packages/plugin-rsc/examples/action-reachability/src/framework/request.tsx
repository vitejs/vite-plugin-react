const URL_POSTFIX = '_.rsc'
const HEADER_ACTION_ID = 'x-rsc-action'
const HEADER_ACTION_FORWARDED = 'x-action-forwarded'
const HEADER_RENDER_URL = 'x-rsc-render-url'

/** Normalized request metadata used by RSC rendering and action routing. */
export type RenderRequest = {
  /** Whether the request targets the RSC transport endpoint. */
  isRsc: boolean
  /** Whether the request invokes a server action. */
  isAction: boolean
  /** 🚀 Action-reachability extension: whether routing already redispatched the action. */
  isActionForwarded: boolean
  /** Explicit server action ID provided by the hydrated client. */
  actionId?: string
  /** Request normalized to the application route URL. */
  request: Request
  /** 🚀 Action-reachability extension: URL whose route should remain visible after redispatch. */
  renderUrl: URL
  /** Application route URL used to execute the request. */
  url: URL
}

export function createRscRenderRequest(
  urlString: string,
  action?: { id: string; body: BodyInit },
): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  const headers = new Headers()
  if (action) {
    headers.set(HEADER_ACTION_ID, action.id)
  }
  return new Request(url, {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}

export function createActionRoutingRequest(
  renderRequest: RenderRequest,
  pathname: string,
): Request {
  const body = renderRequest.request.body
  if (!body) {
    throw new Error('Missing action request body')
  }
  const targetUrl = new URL(renderRequest.request.url)
  targetUrl.pathname = pathname + URL_POSTFIX
  const headers = new Headers(renderRequest.request.headers)
  headers.set(HEADER_ACTION_ID, renderRequest.actionId!)
  headers.set(HEADER_ACTION_FORWARDED, '1')
  headers.set(HEADER_RENDER_URL, renderRequest.renderUrl.href)
  return new Request(targetUrl, {
    method: 'POST',
    headers,
    body,
    // @ts-ignore `duplex` is implemented by Node.js but missing from RequestInit.
    duplex: 'half',
  })
}

export function parseRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url)
  const isAction = request.method === 'POST'
  const isActionForwarded = request.headers.has(HEADER_ACTION_FORWARDED)
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
      isActionForwarded,
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
      isActionForwarded,
      request,
      renderUrl,
      url,
    }
  }
}
