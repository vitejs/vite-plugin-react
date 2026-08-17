import {
  renderToPipeableStream as originalRenderToPipeableStream,
  renderToReadableStream as originalRenderToReadableStream,
} from '../react/rsc/server.node'
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
  RenderToReadableStreamOptions,
} from '../types'
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

export function renderToReadableStream<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: OnClientReference
  },
): ReadableStream<Uint8Array> {
  return originalRenderToReadableStream(data, options, {
    onClientReference: extraOptions?.onClientReference
      ? createOnClientReference(extraOptions.onClientReference)
      : undefined,
  })
}

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
