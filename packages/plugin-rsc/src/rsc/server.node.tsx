import { runWithResourceRenderOptions } from '../core/rsc'
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
    /**
     * CSP nonce for the stylesheet links rendered for server components' CSS.
     * @experimental
     */
    nonce?: string
  },
): ReadableStream<Uint8Array> {
  return runWithResourceRenderOptions({ nonce: extraOptions?.nonce }, () =>
    originalRenderToReadableStream(data, options, {
      onClientReference: extraOptions?.onClientReference
        ? createOnClientReference(extraOptions.onClientReference)
        : undefined,
    }),
  )
}

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: OnClientReference
    /**
     * CSP nonce for the stylesheet links rendered for server components' CSS.
     * @experimental
     */
    nonce?: string
  },
): PipeableStream {
  return runWithResourceRenderOptions({ nonce: extraOptions?.nonce }, () =>
    originalRenderToPipeableStream(data, options, {
      onClientReference: extraOptions?.onClientReference
        ? createOnClientReference(extraOptions.onClientReference)
        : undefined,
    }),
  )
}
