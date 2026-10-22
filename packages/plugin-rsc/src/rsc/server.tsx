import { runWithResourceRenderOptions } from '../core/rsc'
import { renderToReadableStream as originalRenderToReadableStream } from '../react/rsc/server'
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

export * from '../react/rsc/server'

export function renderToReadableStream<T>(
  data: T,
  options?: object,
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
