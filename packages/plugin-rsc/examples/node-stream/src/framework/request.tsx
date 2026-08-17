export const URL_POSTFIX = '_.rsc'
export const HEADER_ACTION_ID = 'x-rsc-action'

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
  return new Request(url.toString(), {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}
