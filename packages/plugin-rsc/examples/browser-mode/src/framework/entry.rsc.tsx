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
import type { ReactFormState } from 'react-dom/client'
import buildServerReferences from 'virtual:vite-rsc-browser-mode/build-server-references'
import { Root } from '../root'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}

declare let __vite_rsc_raw_import__: (id: string) => Promise<unknown>

export function initialize() {
  setRequireModule({
    load: (id) => {
      if (import.meta.env.__vite_rsc_build__) {
        const import_ = buildServerReferences[id]
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
  let returnValue: RscPayload['returnValue'] | undefined
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
      try {
        const data = await action.apply(null, args)
        returnValue = { ok: true, data }
      } catch (e) {
        returnValue = { ok: false, data: e }
      }
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
    status: returnValue?.ok === false ? 500 : undefined,
    headers: {
      'content-type': 'text/x-component;charset=utf-8',
    },
  })
}
