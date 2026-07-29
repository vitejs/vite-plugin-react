import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'
import type { ReactFormState } from 'react-dom/client'
import routeActionManifest from 'virtual:route-action-manifest'
import { parseRenderRequest } from './request.tsx'
import { getRoute, RouteRoot } from './routes.tsx'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)
  request = renderRequest.request
  const { middleware } = getRoute(renderRequest.url.pathname)
  // Forwarded requests re-enter here so the action route replaces the request context.
  return middleware(request, () => handleRequest(renderRequest))
}

async function handleRequest(
  renderRequest: ReturnType<typeof parseRenderRequest>,
): Promise<Response> {
  const request = renderRequest.request
  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  let actionStatus: number | undefined
  let actionRoute: string | undefined
  if (renderRequest.isAction === true) {
    if (renderRequest.actionId) {
      // Select a route whose application graph reaches the requested action.
      actionRoute = Object.entries(routeActionManifest).find(([, actionIds]) =>
        actionIds.includes(renderRequest.actionId!),
      )?.[0]
      if (!actionRoute) {
        return new Response('Server action is not reachable from any route', {
          status: 404,
        })
      }
      if (actionRoute !== renderRequest.url.pathname) {
        // Redispatch through the action route so its middleware establishes context.
        if (request.headers.has('x-action-forwarded')) {
          return new Response(
            'Forwarded server action reached the wrong route',
            {
              status: 404,
            },
          )
        }
        const targetUrl = new URL(request.url)
        targetUrl.pathname = actionRoute + '_.rsc'
        const headers = new Headers(request.headers)
        headers.set('x-action-forwarded', '1')
        // Render the visible route after the action runs through another route.
        headers.set('x-rsc-render-url', renderRequest.url.href)
        return handler(
          new Request(targetUrl, {
            method: request.method,
            headers,
            body: await request.arrayBuffer(),
          }),
        )
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
      // TODO: extract the action ID from React's multipart
      // fields and apply the same route-manifest redispatch before decoding.
      // https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/packages/next/src/server/app-render/action-handler.ts#L1467-L1576
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
    root: (
      <RouteRoot
        pathname={
          new URL(request.headers.get('x-rsc-render-url') ?? renderRequest.url)
            .pathname
        }
      />
    ),
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
        ...(actionRoute && {
          'x-action-route': actionRoute,
          'x-action-forwarded': String(
            request.headers.has('x-action-forwarded'),
          ),
        }),
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
