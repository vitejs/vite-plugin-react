const ACTION_HEADER = 'x-rsc-action'
const RSC_SUFFIX = '_.rsc'

export function createActionRequest(urlString, id, body) {
  const url = new URL(urlString)
  url.pathname += RSC_SUFFIX
  return new Request(url, {
    method: 'POST',
    headers: { [ACTION_HEADER]: id },
    body,
  })
}

export function parseRequest(request) {
  const url = new URL(request.url)
  const isRsc = url.pathname.endsWith(RSC_SUFFIX)
  if (isRsc) url.pathname = url.pathname.slice(0, -RSC_SUFFIX.length)
  return {
    actionId: request.headers.get(ACTION_HEADER),
    isAction: request.method === 'POST',
    isRsc,
    request: new Request(url, request),
  }
}
