import { renderToPipeableStream as originalRenderToPipeableStream } from '../react/rsc/server.node'
import type { PipeableStream, RenderToPipeableStreamOptions } from '../types'
import {
  createOnClientReference,
  type OnClientReference,
} from './client-reference'
import './shared'

export {
  createClientManifest,
  createServerManifest,
  loadServerAction,
} from '../core/rsc'

export * from '../react/rsc/server.node'

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: OnClientReference
  },
): PipeableStream {
  return originalRenderToPipeableStream(data, options, {
    onClientReference: extraOptions?.onClientReference
      ? createOnClientReference(extraOptions.onClientReference)
      : undefined,
  })
}
