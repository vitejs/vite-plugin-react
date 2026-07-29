import routeActionManifest from 'virtual:route-action-manifest'
import { createRscRenderRequest, type RenderRequest } from './request.tsx'

type ActionRoutingResult =
  | { type: 'continue' }
  | { type: 'redispatch'; request: Request }
  | { type: 'reject'; response: Response }

export async function routeActionRequest(
  renderRequest: RenderRequest,
): Promise<ActionRoutingResult> {
  const actionId = renderRequest.actionId
  if (!actionId || !routeActionManifest) {
    return { type: 'continue' }
  }

  const pathname = Object.entries(routeActionManifest).find(([, actionIds]) =>
    actionIds.includes(actionId),
  )?.[0]
  if (!pathname) {
    return {
      type: 'reject',
      response: new Response('Server action is not reachable from any route', {
        status: 404,
      }),
    }
  }
  if (pathname === renderRequest.url.pathname) {
    return { type: 'continue' }
  }
  if (renderRequest.request.headers.has('x-action-forwarded')) {
    return {
      type: 'reject',
      response: new Response(
        'Forwarded server action reached the wrong route',
        { status: 404 },
      ),
    }
  }

  const targetUrl = new URL(renderRequest.request.url)
  targetUrl.pathname = pathname
  const headers = new Headers(renderRequest.request.headers)
  headers.set('x-action-forwarded', '1')
  return {
    type: 'redispatch',
    request: createRscRenderRequest(
      targetUrl.href,
      {
        id: actionId,
        body: await renderRequest.request.arrayBuffer(),
      },
      { headers, renderUrl: renderRequest.renderUrl },
    ),
  }
}
