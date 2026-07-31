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

const $ACTION_ = '$ACTION_'
const $ACTION_REF_ = '$ACTION_REF_'
const $ACTION_ID_ = '$ACTION_ID_'

/**
 * This function mirrors logic inside React's decodeAction and should be kept in
 * sync with that. It pre-parses the FormData to ensure that all action IDs are
 * reachable from the current route.
 * Adapted from Next.js's pre-decode validation:
 * https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/packages/next/src/server/app-render/action-handler.ts#L1467-L1576
 */
export function areAllActionIdsValid(
  mpaFormData: FormData,
  pathname: string,
): boolean {
  if (!routeActionManifest) {
    return true
  }

  const reachableActionIds = routeActionManifest[pathname] ?? []
  let seenActionRefs = 0
  let hasAtLeastOneAction = false
  // Before we attempt to decode the payload for a possible MPA action, assert that all
  // action IDs are valid IDs. If not we should disregard the payload
  for (const key of mpaFormData.keys()) {
    if (!key.startsWith($ACTION_)) {
      // not a relevant field
      continue
    }

    if (key.startsWith($ACTION_ID_)) {
      // No Bound args case
      if (isInvalidActionIdFieldName(key, reachableActionIds)) {
        return false
      }

      hasAtLeastOneAction = true
    } else if (key.startsWith($ACTION_REF_)) {
      if (++seenActionRefs > 2) {
        // We only expect to see at most 2 $ACTION_REF_ fields in the form data:
        // one from <form action="..." method="post">
        // and one from <input action="..." type="submit">
        return false
      }

      // Bound args case
      const actionDescriptorField =
        $ACTION_ + key.slice($ACTION_REF_.length) + ':0'
      const actionFields = mpaFormData.getAll(actionDescriptorField)
      if (actionFields.length !== 1) {
        return false
      }
      const actionField = actionFields[0]
      if (typeof actionField !== 'string') {
        return false
      }

      if (isInvalidStringActionDescriptor(actionField, reachableActionIds)) {
        return false
      }
      hasAtLeastOneAction = true
    }
  }
  return hasAtLeastOneAction
}

const ACTION_DESCRIPTOR_ID_PREFIX = '{"id":"'
function isInvalidStringActionDescriptor(
  actionDescriptor: string,
  reachableActionIds: readonly string[],
): unknown {
  if (actionDescriptor.startsWith(ACTION_DESCRIPTOR_ID_PREFIX) === false) {
    return true
  }

  const from = ACTION_DESCRIPTOR_ID_PREFIX.length
  const to = actionDescriptor.indexOf('"', from)
  if (to === -1) {
    return true
  }

  // We expect actionDescriptor to be '{"id":"<actionId>",...}'
  const actionId = actionDescriptor.slice(from, to)
  if (!reachableActionIds.includes(actionId)) {
    return true
  }

  return false
}

function isInvalidActionIdFieldName(
  actionIdFieldName: string,
  reachableActionIds: readonly string[],
): boolean {
  // The field name must always start with $ACTION_ID_ but since the action id
  // is extracted from the key of the field we have already validated this
  // before entering this function.
  const actionId = actionIdFieldName.slice($ACTION_ID_.length)
  if (!reachableActionIds.includes(actionId)) {
    return true
  }

  return false
}
