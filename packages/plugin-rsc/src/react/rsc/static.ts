// @ts-ignore
import * as ReactStatic from '@vitejs/plugin-rsc/vendor/react-server-dom/static.edge'
import { createClientManifest } from '../../core/rsc'
import type { PrerenderOptions, PrerenderResult } from '../../types'

export function prerender<T>(
  data: T,
  options?: PrerenderOptions,
  extraOptions?: {
    /**
     * @internal
     */
    onClientReference?: (metadata: { id: string; name: string }) => void
  },
): Promise<PrerenderResult> {
  return ReactStatic.prerender(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
