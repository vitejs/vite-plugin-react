import {
  setRequireModule,
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/react/rsc'
import type React from 'react'
import { Root } from '../root'
import type { ReactFormState } from 'react-dom/client'
import serverReferences from 'virtual:vite-rsc-minimal/server-references'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: unknown
  formState?: ReactFormState
}

declare let __vite_rsc_raw_import__: (id: string) => Promise<unknown>

export function initialize() {
  setRequireModule({
    load: (id) => {
      if (import.meta.env.__vite_rsc_build__) {
        const import_ = serverReferences[id]
        if (!import_) {
          throw new Error(`invalid server reference: ${id}`)
        }
        return import_()
      } else {
        return __vite_rsc_raw_import__(/* @vite-ignore */ id)
      }
    },
  })
}

export async function fetchServer(request: Request): Promise<Response> {
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

  const rscPayload: RscPayload = { root: <Root />, formState, returnValue }
  const rscOptions = { temporaryReferences }
  const rscStream = renderToReadableStream<RscPayload>(rscPayload, rscOptions)

  return new Response(rscStream, {
    headers: {
      'content-type': 'text/x-component;charset=utf-8',
      vary: 'accept',
    },
  })
}
