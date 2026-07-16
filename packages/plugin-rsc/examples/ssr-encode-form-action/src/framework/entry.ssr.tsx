import {
  createFromReadableStream,
  encodeReply,
  type EncodeFormActionCallback,
} from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'

type RscPayload = { root: React.ReactNode }

export async function renderHtml(
  rscStream: ReadableStream<Uint8Array>,
): Promise<ReadableStream<Uint8Array>> {
  const encodeFormAction = createEncodeFormAction()

  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream, {
      encodeFormAction,
    })
    return React.use(payload).root
  }

  return renderToReadableStream(<SsrRoot />)
}

type EncodingEntry = {
  status: 'pending' | 'fulfilled' | 'rejected'
  promise: Promise<void>
  data?: FormData
  reason?: unknown
}

function createEncodeFormAction(): EncodeFormActionCallback {
  const cache = new WeakMap<Promise<unknown[]>, EncodingEntry>()

  // Recreates React's default bound-action encoding:
  // https://github.com/react/react/blob/8d48183291870898ec42ac1f84482d9d26789424/packages/react-client/src/ReactFlightReplyClient.js#L462-L508
  const encodeFormAction: EncodeFormActionCallback = (id, bound) => {
    let entry = cache.get(bound)
    if (!entry) {
      const newEntry: EncodingEntry = {
        status: 'pending',
        promise: Promise.resolve(),
      }
      cache.set(bound, newEntry)

      newEntry.promise = encodeReply({ id, bound } as never).then(
        (body) => {
          const data = new FormData()
          if (typeof body === 'string') {
            data.append('0', body)
          } else {
            body.forEach((value, key) => data.append(key, value))
          }
          newEntry.data = data
          newEntry.status = 'fulfilled'
        },
        (reason) => {
          newEntry.reason = reason
          newEntry.status = 'rejected'
        },
      )
      entry = newEntry
    }

    if (entry.status === 'pending') {
      throw entry.promise
    }
    if (entry.status === 'rejected') {
      throw entry.reason
    }

    const data = new FormData()
    entry.data!.forEach((value, key) => {
      data.append(`$ACTION_test:${key}`, value)
    })
    return {
      action: '/?custom-action=1',
      name: '$ACTION_REF_test',
      method: 'POST',
      encType: 'multipart/form-data',
      data,
    }
  }

  return encodeFormAction
}
