import { prerenderToNodeStream as originalPrerenderToNodeStream } from '../react/rsc/static.node'
import type {
  PrerenderToNodeStreamOptions,
  PrerenderToNodeStreamResult,
} from '../types'
import {
  createOnClientReference,
  type OnClientReference,
} from './client-reference'
import './shared'

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
