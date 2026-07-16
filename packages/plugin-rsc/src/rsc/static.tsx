import { prerender as originalPrerender } from '../react/rsc/static'
import type { PrerenderResult, RenderToReadableStreamOptions } from '../types'
import {
  createOnClientReference,
  type OnClientReference,
} from './client-reference'
import './shared'

export function prerender<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: OnClientReference
  },
): Promise<PrerenderResult> {
  return originalPrerender(data, options, {
    onClientReference: extraOptions?.onClientReference
      ? createOnClientReference(extraOptions.onClientReference)
      : undefined,
  })
}
