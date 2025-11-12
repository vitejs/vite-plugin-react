import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'
import type { ReactFormState } from 'react-dom/client'
import { Root } from '../root.tsx'
import { RSC_POSTFIX, type RscPayload } from './shared'

async function handler(request: Request): Promise<Response> {
  // handle server function request
  const isAction = request.method === 'POST'
  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  if (isAction) {
    // x-rsc-action header exists when action is called via `ReactClient.setServerCallback`.
    const actionId = request.headers.get('x-rsc-action')
    if (actionId) {
      const contentType = request.headers.get('content-type')
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text()
      temporaryReferences = createTemporaryReferenceSet()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(actionId)
      try {
        const data = await action.apply(null, args)
        returnValue = { ok: true, data }
      } catch (e) {
        returnValue = { ok: false, data: e }
      }
    } else {
      // otherwise server function is called via `<form action={...}>`
      // before hydration (e.g. when javascript is disabled).
      // aka progressive enhancement.
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      const result = await decodedAction()
      formState = await decodeFormState(result, formData)
    }
  }

  // serialization from React VDOM tree to RSC stream.
  // we render RSC stream after handling server function request
  // so that new render reflects updated state from server function call
  // to achieve single round trip to mutate and fetch from server.
  let url = new URL(request.url)
  let isRscRequest = false
  if (url.pathname.endsWith(RSC_POSTFIX)) {
    isRscRequest = true
    url.pathname = url.pathname.slice(0, -RSC_POSTFIX.length)
  }

  const rscPayload: RscPayload = { root: <Root />, formState, returnValue }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  if (isRscRequest) {
    return new Response(rscStream, {
      status: returnValue?.ok === false ? 500 : undefined,
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  const { renderHTML } = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await renderHTML(rscStream, {
    formState,
    // allow quick simulation of javscript disabled browser
    debugNojs: url.searchParams.has('__nojs'),
  })

  // respond html
  return new Response(htmlStream, {
    status: returnValue?.ok === false ? 500 : undefined,
    headers: {
      'Content-type': 'text/html',
      vary: 'accept',
    },
  })
}

export default {
  fetch(request: Request) {
    return handler(request)
  },
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
