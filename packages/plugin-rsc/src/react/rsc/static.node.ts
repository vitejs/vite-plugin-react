// @ts-ignore
import * as ReactStaticNode from '@vitejs/plugin-rsc/vendor/react-server-dom/static.node'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  PrerenderOptions,
  PrerenderResult,
  PrerenderToNodeStreamOptions,
} from '../../types'

export interface PrerenderToNodeStreamResult {
  prelude: import('node:stream').Readable
}

export function prerender<T>(
  data: T,
  options?: PrerenderOptions,
  extraOptions?: CreateClientManifestOptions,
): Promise<PrerenderResult> {
  return ReactStaticNode.prerender(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}

export function prerenderToNodeStream<T>(
  data: T,
  options?: PrerenderToNodeStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): Promise<PrerenderToNodeStreamResult> {
  return ReactStaticNode.prerenderToNodeStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
