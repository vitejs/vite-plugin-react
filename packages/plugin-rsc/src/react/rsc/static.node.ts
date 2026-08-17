// @ts-ignore
import * as ReactStaticNode from '@vitejs/plugin-rsc/vendor/react-server-dom/static.node'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  PrerenderOptions,
  PrerenderResult,
  PrerenderToNodeStreamResult,
  PrerenderToNodeStreamOptions,
} from '../../types'

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
