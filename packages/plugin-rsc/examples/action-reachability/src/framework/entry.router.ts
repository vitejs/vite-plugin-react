import deployments from 'virtual:route-deployments'
import { routeActionRequest } from './action-routing.ts'
import { parseRenderRequest } from './request.tsx'

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  let renderRequest = parseRenderRequest(request)
  if (renderRequest.actionId) {
    const routing = routeActionRequest(renderRequest)
    if (routing.type === 'reject') return routing.response
    if (routing.type === 'redispatch') {
      request = routing.request
      renderRequest = parseRenderRequest(request)
    }
  }

  const load = deployments[renderRequest.url.pathname]
  if (!load) return new Response('Not Found', { status: 404 })
  const deployment = await load()
  return deployment.default.fetch(request)
}
