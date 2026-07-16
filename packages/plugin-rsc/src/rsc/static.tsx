import { prerender as originalPrerender } from '../react/rsc/static'
import type { PrerenderResult, RenderToReadableStreamOptions } from '../types'
import {
  createOnClientReference,
  type ClientReferenceOptions,
} from './client-reference'
import './shared'

export function prerender<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: ClientReferenceOptions,
): Promise<PrerenderResult> {
  return originalPrerender(data, options, {
    onClientReference: createOnClientReference(extraOptions),
  })
}
