import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc/server'
import type React from 'react'
import type { ReactFormState } from 'react-dom/client'
import { parseRenderRequest } from './request.tsx'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
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
  const renderRequest = parseRenderRequest(request)
  request = renderRequest.request

  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  let actionStatus: number | undefined
  if (renderRequest.isAction === true) {
    if (renderRequest.actionId) {
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

  const rscPayload: RscPayload = { root: getRoot(), formState, returnValue }
  const rscOptions = { temporaryReferences }
  const debugClientReferences: unknown[] = []
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions, {
    onClientReference(metadata) {
      debugClientReferences.push(metadata)
    },
  })

  // test `onClientReference` callback
  if (renderRequest.url.pathname === '/__test_onClientReference') {
    await rscStream.pipeTo(new WritableStream({ write() {} }))
    return Response.json(debugClientReferences)
  }

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
    nonce,
    debugNojs: renderRequest.url.searchParams.has('__nojs'),
  })

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
