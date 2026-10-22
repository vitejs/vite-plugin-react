import { runWithResourceRenderOptions } from '../core/rsc'
import { prerender as originalPrerender } from '../react/rsc/static'
import type { PrerenderOptions, PrerenderResult } from '../types'
import {
  createOnClientReference,
  type OnClientReference,
} from './client-reference'
import './shared'

export function prerender<T>(
  data: T,
  options?: PrerenderOptions,
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
): Promise<PrerenderResult> {
  return runWithResourceRenderOptions({ nonce: extraOptions?.nonce }, () =>
    originalPrerender(data, options, {
      onClientReference: extraOptions?.onClientReference
        ? createOnClientReference(extraOptions.onClientReference)
        : undefined,
    }),
  )
}
