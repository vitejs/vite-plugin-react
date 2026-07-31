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

const ACTION_PREFIX = '$ACTION_'
const ACTION_REF_PREFIX = '$ACTION_REF_'
const ACTION_ID_PREFIX = '$ACTION_ID_'
const ACTION_DESCRIPTOR_ID_PREFIX = '{"id":"'

/**
 * Mirrors React's decodeAction field inspection so progressive form actions
 * are validated against the current route before React loads one of them.
 * Based on Next.js's pre-decode validation:
 * https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/packages/next/src/server/app-render/action-handler.ts#L1467-L1576
 */
export function isActionFormDataValid(
  formData: FormData,
  pathname: string,
): boolean {
  if (!routeActionManifest) {
    return true
  }

  const reachableActionIds = routeActionManifest[pathname] ?? []
  let seenActionRefs = 0
  let hasAction = false
  for (const key of formData.keys()) {
    if (!key.startsWith(ACTION_PREFIX)) {
      continue
    }

    if (key.startsWith(ACTION_ID_PREFIX)) {
      const actionId = key.slice(ACTION_ID_PREFIX.length)
      if (!reachableActionIds.includes(actionId)) {
        return false
      }
      hasAction = true
    } else if (key.startsWith(ACTION_REF_PREFIX)) {
      // React can submit one action from the form and one from the submitter.
      if (++seenActionRefs > 2) {
        return false
      }

      const descriptorKey =
        ACTION_PREFIX + key.slice(ACTION_REF_PREFIX.length) + ':0'
      const descriptors = formData.getAll(descriptorKey)
      if (descriptors.length !== 1 || typeof descriptors[0] !== 'string') {
        return false
      }

      const descriptor = descriptors[0]
      if (!descriptor.startsWith(ACTION_DESCRIPTOR_ID_PREFIX)) {
        return false
      }
      let metadata: unknown
      try {
        metadata = JSON.parse(descriptor)
      } catch {
        return false
      }
      if (
        typeof metadata !== 'object' ||
        metadata === null ||
        !('id' in metadata) ||
        typeof metadata.id !== 'string' ||
        !reachableActionIds.includes(metadata.id)
      ) {
        return false
      }
      hasAction = true
    }
  }
  return hasAction
}
