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

export type RscPayload = {
  root: React.ReactNode
  returnValue?: unknown
  formState?: ReactFormState
}

export default async function handler(request: Request): Promise<Response> {
  const isAction = request.method === 'POST'
  let returnValue: unknown | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  if (isAction) {
    const actionId = request.headers.get('x-rsc-action')
    if (actionId) {
      const contentType = request.headers.get('content-type')
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text()
      temporaryReferences = createTemporaryReferenceSet()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(actionId)
      returnValue = await action.apply(null, args)
    } else {
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      const result = await decodedAction()
      formState = await decodeFormState(result, formData)
    }
  }

  const url = new URL(request.url)
  const rscPayload: RscPayload = {
    root: <Root url={url} />,
    formState,
    returnValue,
  }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  const isRscRequest =
    (!request.headers.get('accept')?.includes('text/html') &&
      !url.searchParams.has('__html')) ||
    url.searchParams.has('__rsc')

  if (isRscRequest) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await ssrEntryModule.renderHTML(rscStream, {
    formState,
    debugNojs: url.searchParams.has('__nojs'),
  })

  return new Response(htmlStream, {
    headers: {
      'Content-type': 'text/html',
      vary: 'accept',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
