// @ts-ignore
import * as ReactClientNode from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import { createServerConsumerManifest } from '../core/ssr'
import type {
  ClientTemporaryReferenceSet,
  CreateFromNodeStreamOptions,
  CreateFromReadableStreamEdgeOptions,
  EncodeReplyFunction,
} from '../types'

export { setRequireModule } from '../core/ssr'
export type { EncodeFormActionCallback } from '../types'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamEdgeOptions = {},
): Promise<T> {
  return ReactClientNode.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(),
    ...options,
  })
}

export function createFromNodeStream<T>(
  stream: import('node:stream').Readable,
  options: CreateFromNodeStreamOptions = {},
): Promise<T> {
  return ReactClientNode.createFromNodeStream(
    stream,
    createServerConsumerManifest(),
    options,
  )
}

export function createServerReference(id: string): unknown {
  return ReactClientNode.createServerReference(id)
}

export const encodeReply: EncodeReplyFunction = ReactClientNode.encodeReply

export const createTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClientNode.createTemporaryReferenceSet

export const callServer = null
export const findSourceMapURL = null
