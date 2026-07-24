// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge'
import { createServerConsumerManifest } from '../core/ssr'
import type {
  ClientTemporaryReferenceSet,
  CreateFromReadableStreamEdgeOptions,
  EncodeReplyFunction,
} from '../types'

export { setRequireModule } from '../core/ssr'
export type { EncodeFormActionCallback } from '../types'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamEdgeOptions = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(),
    ...options,
  })
}

export function createServerReference(id: string): unknown {
  return ReactClient.createServerReference(id)
}

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

// TODO: There is probably no actual use case, but for now export what is technically available.
export const createTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet

export const callServer = null
export const findSourceMapURL = null
