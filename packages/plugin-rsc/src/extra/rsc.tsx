import type { ReactFormState } from 'react-dom/client'
import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '../rsc'

export type RscPayload = {
  root: React.ReactNode
  formState?: ReactFormState
  returnValue?: unknown
}

export async function renderRequest(
  request: Request,
  root: React.ReactNode,
  options?: { nonce?: string },
): Promise<Response> {
  function RscRoot() {
    // https://vite.dev/guide/features.html#content-security-policy-csp
    // this isn't needed if `style-src: 'unsafe-inline'` (dev) and `script-src: 'self'`
    const nonceMeta = options?.nonce && (
      <meta property="csp-nonce" nonce={options.nonce} />
    )
    return (
      <>
        {nonceMeta}
        {root}
      </>
    )
  }

  const url = new URL(request.url)
  const isAction = request.method === 'POST'

  // use ?__rsc and ?__html for quick debugging
  const isRscRequest =
    (!request.headers.get('accept')?.includes('text/html') &&
      !url.searchParams.has('__html')) ||
    url.searchParams.has('__rsc')

  // TODO: error handling
  // callAction
  let returnValue: unknown | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  if (isAction) {
    const actionId = request.headers.get('x-rsc-action')
    if (actionId) {
      // client stream request
      const contentType = request.headers.get('content-type')
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text()
      temporaryReferences = createTemporaryReferenceSet()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(actionId)
      returnValue = await action.apply(null, args)
    } else {
      // progressive enhancement
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      const result = await decodedAction()
      formState = await decodeFormState(result, formData)
    }
  }

  const rscPayload: RscPayload = { root: <RscRoot />, formState, returnValue }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  if (isRscRequest) {
    return new Response(rscStream, {
      headers: {
        'content-type': 'text/x-component;charset=utf-8',
        vary: 'accept',
      },
    })
  }

  const ssrEntry = await import.meta.viteRsc.loadModule<typeof import('./ssr')>(
    'ssr',
    'index',
  )
  return ssrEntry.renderHtml(rscStream, {
    formState,
    nonce: options?.nonce,
    debugNoJs: url.searchParams.has('__nojs'),
  })
}
