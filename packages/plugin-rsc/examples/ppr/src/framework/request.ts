const URL_POSTFIX = '_.rsc'

export function createRscRenderRequest(urlString: string): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  return new Request(url)
}

export function parseRenderRequest(request: Request): {
  isRsc: boolean
  request: Request
  url: URL
} {
  const url = new URL(request.url)
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    return {
      isRsc: true,
      request: new Request(url, request),
      url,
    }
  }
  return { isRsc: false, request, url }
}
