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
  },
): Promise<PrerenderResult> {
  return originalPrerender(data, options, {
    onClientReference: extraOptions?.onClientReference
      ? createOnClientReference(extraOptions.onClientReference)
      : undefined,
  })
}

export function prerenderToNodeStream<T>(
  data: T,
  options?: PrerenderToNodeStreamOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: OnClientReference
  },
): Promise<PrerenderToNodeStreamResult> {
  return originalPrerenderToNodeStream(data, options, {
    onClientReference: extraOptions?.onClientReference
      ? createOnClientReference(extraOptions.onClientReference)
      : undefined,
  })
}
