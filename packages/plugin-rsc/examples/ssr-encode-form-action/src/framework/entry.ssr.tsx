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
  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream, {
      encodeFormAction: customEncodeFormAction,
    })
    return React.use(payload).root
  }

  return renderToReadableStream(<SsrRoot />)
}

// Preserve React's default form metadata, but post to a custom URL.
const customEncodeFormAction: EncodeFormActionCallback = (id, bound) => {
  const defaultResult = defaultEncodeFormAction(id, bound)
  return {
    ...defaultResult,
    action: '/?custom-action=1',
  }
}

// Recreates React's default bound-action encoding:
// https://github.com/react/react/blob/8d48183291870898ec42ac1f84482d9d26789424/packages/react-client/src/ReactFlightReplyClient.js#L462-L508

// React supplies this internally, but encodeFormAction does not receive it.
const identifierPrefix = 'custom_prefix'

type FormDataThenable = Promise<FormData> & {
  status?: 'pending' | 'fulfilled' | 'rejected'
  value?: FormData
  reason?: unknown
}

// React caches by its internal server-reference object. The callback only exposes
// the bound promise, so this example uses that promise as the cache identity.
const boundCache = new WeakMap<Promise<unknown[]>, FormDataThenable>()

const defaultEncodeFormAction: EncodeFormActionCallback = (id, bound) => {
  let data: null | FormData = null
  let name
  // React's custom callback always receives a promise, so it cannot distinguish
  // an unbound reference from one bound with no arguments. This example is bound.
  const boundPromise = bound
  if (boundPromise !== null) {
    const reference = { id, bound }
    let thenable = boundCache.get(boundPromise)
    if (!thenable) {
      thenable = encodeFormData(reference)
      boundCache.set(boundPromise, thenable)
    }
    if (thenable.status === 'rejected') {
      throw thenable.reason
    } else if (thenable.status !== 'fulfilled') {
      throw thenable
    }
    const encodedFormData = thenable.value!
    const prefixedData = new FormData()
    encodedFormData.forEach((value, key) => {
      prefixedData.append('$ACTION_' + identifierPrefix + ':' + key, value)
    })
    data = prefixedData
    name = '$ACTION_REF_' + identifierPrefix
  }

  return {
    name: name,
    method: 'POST',
    encType: 'multipart/form-data',
    data: data,
  }
}

function encodeFormData(reference: {
  id: string
  bound: Promise<unknown[]>
}): FormDataThenable {
  // Unlike React's internal processReply, the public encodeReply returns a
  // regular promise, so instrument it with the status React's renderer expects.
  const thenable = encodeReply(reference as never).then(
    (body) => {
      if (typeof body === 'string') {
        const data = new FormData()
        data.append('0', body)
        body = data
      }
      thenable.status = 'fulfilled'
      thenable.value = body
      return body
    },
    (reason) => {
      thenable.status = 'rejected'
      thenable.reason = reason
      throw reason
    },
  ) as FormDataThenable
  thenable.status = 'pending'
  return thenable
}
