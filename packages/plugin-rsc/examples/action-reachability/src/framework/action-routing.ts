import routeActionManifest from 'virtual:route-action-manifest'
import { createActionRoutingRequest, type RenderRequest } from './request.tsx'

type ActionRoutingResult =
  | { type: 'continue' }
  | { type: 'redispatch'; request: Request }
  | { type: 'reject'; response: Response }

/**
 * Routes an action through middleware for a page whose graph reaches it.
 * Production uses the generated manifest, while development stays on the
 * current route.
 */
export function routeActionRequest(
  renderRequest: RenderRequest,
): ActionRoutingResult {
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
  if (renderRequest.isActionForwarded) {
    return {
      type: 'reject',
      response: new Response(
        'Forwarded server action reached the wrong route',
        { status: 404 },
      ),
    }
  }
  return {
    type: 'redispatch',
    request: createActionRoutingRequest(renderRequest, pathname),
  }
}

export class UnreachableServerReferenceError extends Error {}

/**
 * Rejects server references that the current route cannot reach while React
 * decodes an action request, including server functions passed as arguments
 * or bound to the action.
 */
export function createServerReferenceValidator(
  pathname: string,
): ((metadata: { id: string; name: string }) => void) | undefined {
  if (!routeActionManifest) {
    return
  }
  const reachableActionIds = routeActionManifest[pathname] ?? []
  return ({ id, name }) => {
    if (!reachableActionIds.includes(`${id}#${name}`)) {
      throw new UnreachableServerReferenceError(`${id}#${name}`)
    }
  }
}
