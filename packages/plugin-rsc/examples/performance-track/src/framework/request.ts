const URL_POSTFIX = '_.rsc'

export function createRscRenderRequest(urlString: string): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  return new Request(url)
}

export function parseRenderRequest(request: Request): {
  isRsc: boolean
  url: URL
} {
  const url = new URL(request.url)
  const isRsc = url.pathname.endsWith(URL_POSTFIX)
  if (isRsc) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
  }
  return { isRsc, url }
}
