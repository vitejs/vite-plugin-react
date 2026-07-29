import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'
import type { ReactFormState } from 'react-dom/client'
import { getRoute, RouteRoot } from '../app/routes.tsx'
import { routeActionRequest } from './action-routing.ts'
import { parseRenderRequest } from './request.tsx'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  const { middleware } = getRoute(renderRequest.url.pathname)
  // Redispatched actions re-enter route middleware before execution.
  return middleware(renderRequest.request, () => handleRequest(renderRequest))
}

async function handleRequest(
  renderRequest: ReturnType<typeof parseRenderRequest>,
): Promise<Response> {
  const request = renderRequest.request
  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  let actionStatus: number | undefined
  if (renderRequest.isAction === true) {
    if (renderRequest.actionId) {
      // Run the action through middleware for a page whose graph reaches it.
      const routing = routeActionRequest(renderRequest)
      if (routing.type === 'reject') {
        return routing.response
      }
      if (routing.type === 'redispatch') {
        return handler(routing.request)
      }
      const contentType = request.headers.get('content-type')
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text()
      temporaryReferences = createTemporaryReferenceSet()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(renderRequest.actionId)
      try {
        const data = await action.apply(null, args)
        returnValue = { ok: true, data }
      } catch (e) {
        returnValue = { ok: false, data: e }
        actionStatus = 500
      }
    } else {
      // TODO: Extract the submitted action ID from React's multipart fields and
      // apply the same route-aware redispatch before decodeAction().
      // Next.js's pre-decode validation shows how these fields are inspected:
      // https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/packages/next/src/server/app-render/action-handler.ts#L1467-L1576
      // TODO: Determine whether progressive forms need redispatch in practice.
      // A progressive form normally posts back to the route that rendered it,
      // so the action already runs through that route's middleware.
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      try {
        const result = await decodedAction()
        formState = await decodeFormState(result, formData)
      } catch (e) {
        return new Response('Internal Server Error: server action failed', {
          status: 500,
        })
      }
    }
  }

  const rscPayload: RscPayload = {
    root: <RouteRoot pathname={renderRequest.renderUrl.pathname} />,
    formState,
    returnValue,
  }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      status: actionStatus,
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
      },
    })
  }

  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const ssrResult = await ssrEntryModule.renderHTML(rscStream, {
    formState,
    debugNojs: renderRequest.url.searchParams.has('__nojs'),
  })

  return new Response(ssrResult.stream, {
    status: ssrResult.status,
    headers: {
      'Content-type': 'text/html',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
