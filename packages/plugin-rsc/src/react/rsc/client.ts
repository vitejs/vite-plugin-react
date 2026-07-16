// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge'
import {
  createServerDecodeClientManifest,
  createServerManifest,
} from '../../core/rsc'
import type {
  ClientTemporaryReferenceSet,
  CreateFromReadableStreamEdgeOptions,
  EncodeReplyFunction,
} from '../../types'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamEdgeOptions = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      // https://github.com/facebook/react/pull/31300
      // https://github.com/vercel/next.js/pull/71527
      serverModuleMap: createServerManifest({ preserveServerReferences: true }),
      moduleMap: createServerDecodeClientManifest(),
    },
    ...options,
  })
}

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

export const createClientTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet
