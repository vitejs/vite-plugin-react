const URL_POSTFIX = '_.rsc'
const HEADER_ACTION_ID = 'x-rsc-action'

export function createRscRenderRequest(
  urlString: string,
  action?: { id: string; body: BodyInit },
): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  const headers = new Headers()
  if (action) headers.set(HEADER_ACTION_ID, action.id)
  return new Request(url.toString(), {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}

export function parseRenderRequest(request: Request) {
  const url = new URL(request.url)
  const isAction = request.method === 'POST'
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    return {
      isRsc: true,
      isAction,
      actionId: request.headers.get(HEADER_ACTION_ID) || undefined,
      request: new Request(url, request),
    }
  }
  return { isRsc: false, isAction, actionId: undefined, request }
}
