// @ts-ignore
import * as ReactStatic from '@vitejs/plugin-rsc/vendor/react-server-dom/static.edge'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  PrerenderResult,
  RenderToReadableStreamOptions,
} from '../../types'

export function prerender<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): Promise<PrerenderResult> {
  return ReactStatic.prerender(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
