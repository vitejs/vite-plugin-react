import {
  prerenderToNodeStream as originalPrerenderToNodeStream,
  type PrerenderToNodeStreamResult,
} from '../react/rsc/static.node'
import type { RenderToPipeableStreamOptions } from '../types'
import {
  createOnClientReference,
  type OnClientReference,
} from './client-reference'
import './shared'

export { type PrerenderToNodeStreamResult } from '../react/rsc/static.node'

export function prerenderToNodeStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
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
