// @ts-ignore
import * as ReactStaticNode from '@vitejs/plugin-rsc/vendor/react-server-dom/static.node'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  PrerenderResult,
  RenderToPipeableStreamOptions,
  RenderToReadableStreamOptions,
} from '../../types'

export interface PrerenderToNodeStreamResult {
  prelude: import('node:stream').Readable
}

export function prerender<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
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
  options?: RenderToPipeableStreamOptions,
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
