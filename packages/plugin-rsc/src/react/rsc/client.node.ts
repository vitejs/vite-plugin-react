// @ts-ignore
import * as ReactClientNode from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import type {
  ClientTemporaryReferenceSet,
  CreateFromNodeStreamOptions,
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
  return ReactClientNode.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(extraOptions),
    ...options,
  })
}

export function createFromNodeStream<T>(
  stream: import('node:stream').Readable,
  options: CreateFromNodeStreamOptions = {},
  extraOptions?: CreateFromStreamExtraOptions,
): Promise<T> {
  return ReactClientNode.createFromNodeStream(
    stream,
    createServerConsumerManifest(extraOptions),
    options,
  )
}

export const encodeReply: EncodeReplyFunction = ReactClientNode.encodeReply

export const createClientTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClientNode.createTemporaryReferenceSet
