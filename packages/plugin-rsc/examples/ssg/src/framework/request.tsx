// Framework conventions (arbitrary choices for this demo):
// - Use `_.rsc` URL suffix to differentiate RSC requests from SSR requests
const URL_POSTFIX = '_.rsc'

// Parsed request information used to route between RSC/SSR rendering.
// Created by parseRenderRequest() from incoming HTTP requests.
type RenderRequest = {
  isRsc: boolean // true if request should return RSC payload (via _.rsc suffix)
  request: Request // normalized Request with _.rsc suffix removed from URL
  url: URL // normalized URL with _.rsc suffix removed
}

export function createRscRenderRequest(urlString: string): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  return new Request(url.toString())
}

export function parseRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url)
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    return {
      isRsc: true,
      request: new Request(url, request),
      url,
    }
  } else {
    return {
      isRsc: false,
      request,
      url,
    }
  }
}
