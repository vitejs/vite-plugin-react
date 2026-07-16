import { renderToReadableStream as originalRenderToReadableStream } from '../react/rsc/server'
import {
  createOnClientReference,
  type ClientReferenceOptions,
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
  extraOptions?: ClientReferenceOptions,
): ReadableStream<Uint8Array> {
  return originalRenderToReadableStream(data, options, {
    onClientReference: createOnClientReference(extraOptions),
  })
}
