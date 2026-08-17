// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge'
import type {
  ClientTemporaryReferenceSet,
  CreateFromReadableStreamEdgeOptions,
  EncodeReplyFunction,
} from '../../types'
import {
  createServerConsumerManifest,
  type CreateFromStreamExtraOptions,
} from './client.shared'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamEdgeOptions = {},
  extraOptions?: CreateFromStreamExtraOptions,
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(extraOptions),
    ...options,
  })
}

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

export const createClientTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet
