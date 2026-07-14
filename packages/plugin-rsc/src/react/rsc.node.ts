// @ts-ignore
import * as ReactServerNode from '@vitejs/plugin-rsc/vendor/react-server-dom/server.node'
import { createClientManifest } from '../core/rsc'
import type { PipeableStream, RenderToPipeableStreamOptions } from '../types'

export * from './rsc'

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: {
    /**
     * @internal
     */
    onClientReference?: (metadata: { id: string; name: string }) => void
  },
): PipeableStream {
  return ReactServerNode.renderToPipeableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
