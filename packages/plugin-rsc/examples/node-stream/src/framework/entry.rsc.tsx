import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import { finished } from 'node:stream/promises'
import {
  renderToPipeableStream,
  loadServerAction,
  decodeReply,
  decodeReplyFromBusboy,
  decodeAction,
  decodeFormState,
  createTemporaryReferenceSet,
} from '@vitejs/plugin-rsc/rsc/server.node'
import busboy from 'busboy'
import type { ReactFormState } from 'react-dom/client'
import { Root } from '../root'
import {
  parseRenderRequest,
  readRequestBody,
  requestToFormData,
} from './request.node'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const renderRequest = parseRenderRequest(request)

  let returnValue: RscPayload['returnValue'] | undefined
  let formState: ReactFormState | undefined
  let temporaryReferences: unknown | undefined
  let actionStatus: number | undefined
  if (renderRequest.isAction === true) {
    if (renderRequest.actionId) {
      const contentType = request.headers['content-type']
      temporaryReferences = createTemporaryReferenceSet()
      let args: unknown[]
      if (contentType?.startsWith('multipart/form-data')) {
        const parser = busboy({ headers: request.headers })
        const argsPromise = decodeReplyFromBusboy(parser, {
          temporaryReferences,
        })
        request.pipe(parser)
        args = await argsPromise
      } else {
        const body = await readRequestBody(request)
        args = await decodeReply(body.toString(), { temporaryReferences })
      }
      const action = await loadServerAction(renderRequest.actionId)
      try {
        const data = await action.apply(null, args)
        returnValue = { ok: true, data }
      } catch (e) {
        returnValue = { ok: false, data: e }
        actionStatus = 500
      }
    } else {
      const formData = await requestToFormData(request)
      const decodedAction = await decodeAction(formData)
      try {
        const result = await decodedAction()
        formState = await decodeFormState(result, formData)
      } catch (e) {
        response.statusCode = 500
        response.end('Internal Server Error: server action failed')
        return
      }
    }
  }

  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} />,
    formState,
    returnValue,
  }
  const pipeableStream = renderToPipeableStream<RscPayload>(rscPayload, {
    temporaryReferences,
  })

  if (renderRequest.isRsc) {
    response.statusCode = actionStatus ?? 200
    response.setHeader('content-type', 'text/x-component;charset=utf-8')
    pipeableStream.pipe(response)
    await finished(response)
    return
  }

  const rscStream = new PassThrough()
  pipeableStream.pipe(rscStream)
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const ssrResult = await ssrEntryModule.renderHTML(rscStream, {
    formState,
    debugNojs: renderRequest.url.searchParams.has('__nojs'),
  })

  response.statusCode = ssrResult.status ?? 200
  response.setHeader('content-type', 'text/html')
  ssrResult.stream.pipe(response)
  await finished(response)
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
