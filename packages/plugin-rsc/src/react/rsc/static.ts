// @ts-ignore
import * as ReactStatic from '@vitejs/plugin-rsc/vendor/react-server-dom/static.edge'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type { PrerenderOptions, PrerenderResult } from '../../types'

export function prerender<T>(
  data: T,
  options?: PrerenderOptions,
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
