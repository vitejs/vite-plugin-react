import { runWithResourceRenderOptions } from '../core/rsc'
import {
  prerender as originalPrerender,
  prerenderToNodeStream as originalPrerenderToNodeStream,
} from '../react/rsc/static.node'
import type {
  PrerenderOptions,
  PrerenderResult,
  PrerenderToNodeStreamOptions,
  PrerenderToNodeStreamResult,
} from '../types'
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

export function prerenderToNodeStream<T>(
  data: T,
  options?: PrerenderToNodeStreamOptions,
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
): Promise<PrerenderToNodeStreamResult> {
  return runWithResourceRenderOptions({ nonce: extraOptions?.nonce }, () =>
    originalPrerenderToNodeStream(data, options, {
      onClientReference: extraOptions?.onClientReference
        ? createOnClientReference(extraOptions.onClientReference)
        : undefined,
    }),
  )
}
