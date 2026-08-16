// @ts-ignore
import * as ReactServerNode from '@vitejs/plugin-rsc/vendor/react-server-dom/server.node'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type { PipeableStream, RenderToPipeableStreamOptions } from '../../types'

export * from './server'

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): PipeableStream {
  return ReactServerNode.renderToPipeableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
