import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'
import type React from 'react'
import type { ReactFormState } from 'react-dom/client'
import { parseRenderRequest } from './request.tsx'
import '../styles.css'

// The schema of payload which is serialized into RSC stream on rsc environment
// and deserialized on ssr/client environments.
export type RscPayload = {
  // this demo renders/serializes/deserizlies entire root html element
  // but this mechanism can be changed to render/fetch different parts of components
  // based on your own route conventions.
  root: React.ReactNode
  // server action return value of non-progressive enhancement case
  returnValue?: { ok: boolean; data: unknown }
  // server action form state (e.g. useActionState) of progressive enhancement case
  formState?: ReactFormState
}

async function handleRequest({
  request,
  getRoot,
  nonce,
}: {
  request: Request
  getRoot: () => React.ReactNode
  nonce?: string
}): Promise<Response> {
  // differentiate RSC, SSR, action, etc.
  const renderRequest = parseRenderRequest(request)
  request = renderRequest.request

  // handle server function request
  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  let actionStatus: number | undefined
  if (renderRequest.isAction === true) {
    if (renderRequest.actionId) {
      // action is called via `ReactClient.setServerCallback`.
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
      // otherwise server function is called via `<form action={...}>`
      // before hydration (e.g. when javascript is disabled).
      // aka progressive enhancement.
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      try {
        const result = await decodedAction()
        formState = await decodeFormState(result, formData)
      } catch (e) {
        // there's no single general obvious way to surface this error,
        // so explicitly return classic 500 response.
        return new Response('Internal Server Error: server action failed', {
          status: 500,
        })
      }
    }
  }

  const rscPayload: RscPayload = { root: getRoot(), formState, returnValue }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  // Respond RSC stream without HTML rendering as decided by `RenderRequest`
  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      status: actionStatus,
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
      },
    })
  }

  // Delegate to SSR environment for html rendering.
  // The plugin provides `loadModule` helper to allow loading SSR environment entry module
  // in RSC environment. however this can be customized by implementing own runtime communication
  // e.g. `@cloudflare/vite-plugin`'s service binding.
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const ssrResult = await ssrEntryModule.renderHTML(rscStream, {
    formState,
    nonce,
    // allow quick simulation of javascript disabled browser
    debugNojs: renderRequest.url.searchParams.has('__nojs'),
  })

  // respond html
  return new Response(ssrResult.stream, {
    status: ssrResult.status,
    headers: {
      'content-type': 'text/html;charset=utf-8',
    },
  })
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  const { Root } = await import('../routes/root.tsx')
  const nonce = !process.env.NO_CSP ? crypto.randomUUID() : undefined
  // https://vite.dev/guide/features.html#content-security-policy-csp
  // this isn't needed if `style-src: 'unsafe-inline'` (dev) and `script-src: 'self'`
  const nonceMeta = nonce && <meta property="csp-nonce" nonce={nonce} />
  const root = (
    <>
      {/* this `loadCss` only collects `styles.css` but not css inside dynamic import `root.tsx` */}
      {import.meta.viteRsc.loadCss()}
      {nonceMeta}
      <Root url={url} />
    </>
  )
  const response = await handleRequest({
    request,
    getRoot: () => root,
    nonce,
  })
  if (nonce && response.headers.get('content-type')?.includes('text/html')) {
    const cspValue = [
      `default-src 'self';`,
      // `unsafe-eval` is required during dev since React uses eval for findSourceMapURL feature
      `script-src 'self' 'nonce-${nonce}' ${import.meta.env.DEV ? `'unsafe-eval'` : ``};`,
      `style-src 'self' 'unsafe-inline';`,
      `img-src 'self' data:;`,
      // allow blob: worker for Vite server ping shared worker
      import.meta.hot && `worker-src 'self' blob:;`,
    ]
      .filter(Boolean)
      .join('')
    response.headers.set('content-security-policy', cspValue)
  }
  return response
}

export default {
  fetch: handler,
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
