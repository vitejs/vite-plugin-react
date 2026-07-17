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
  extraOptions?: {
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
  },
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      // https://github.com/facebook/react/pull/31300
      // https://github.com/vercel/next.js/pull/71527
      serverModuleMap: createServerManifest({
        preserveServerReferences: extraOptions?.preserveServerReferences,
      }),
      moduleMap: createServerDecodeClientManifest(),
    },
    ...options,
  })
}

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

export const createClientTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet
