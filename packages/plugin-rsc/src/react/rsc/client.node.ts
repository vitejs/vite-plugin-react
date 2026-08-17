// @ts-ignore
import * as ReactClientNode from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import {
  createServerDecodeClientManifest,
  createServerManifest,
} from '../../core/rsc'
import type {
  ClientTemporaryReferenceSet,
  CreateFromNodeStreamOptions,
  CreateFromReadableStreamEdgeOptions,
  EncodeReplyFunction,
} from '../../types'

type ExtraOptions = {
  /**
   * Preserve server references for re-serialization without loading their modules.
   * Preserved references cannot be invoked in the current RSC environment.
   *
   * Disabled by default because this API also decodes bound server action
   * arguments, which must revive references as callable implementations.
   *
   * @experimental
   * @default false
   */
  preserveServerReferences?: boolean
}

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamEdgeOptions = {},
  extraOptions?: ExtraOptions,
): Promise<T> {
  return ReactClientNode.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(extraOptions),
    ...options,
  })
}

export function createFromNodeStream<T>(
  stream: import('node:stream').Readable,
  options: CreateFromNodeStreamOptions = {},
  extraOptions?: ExtraOptions,
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

function createServerConsumerManifest(extraOptions?: ExtraOptions) {
  return {
    serverModuleMap: createServerManifest({
      preserveServerReferences: extraOptions?.preserveServerReferences,
    }),
    moduleMap: createServerDecodeClientManifest(),
  }
}
