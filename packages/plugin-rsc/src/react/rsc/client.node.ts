// @ts-ignore
import * as ReactClientNode from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import {
  createServerDecodeClientManifest,
  createServerManifest,
} from '../../core/rsc'
import type { CreateFromNodeStreamOptions } from '../../types'

export * from './client'

export function createFromNodeStream<T>(
  stream: import('node:stream').Readable,
  options: CreateFromNodeStreamOptions = {},
  extraOptions?: {
    /**
     * @experimental
     * @default false
     */
    preserveServerReferences?: boolean
  },
): Promise<T> {
  return ReactClientNode.createFromNodeStream(stream, {
    serverConsumerManifest: {
      serverModuleMap: createServerManifest({
        preserveServerReferences: extraOptions?.preserveServerReferences,
      }),
      moduleMap: createServerDecodeClientManifest(),
    },
    ...options,
  })
}
