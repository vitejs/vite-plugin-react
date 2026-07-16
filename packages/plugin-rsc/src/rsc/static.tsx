import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import type { ResolvedAssetDeps } from '../plugin'
import { prerender as originalPrerender } from '../react/rsc/static'
import type { PrerenderOptions, PrerenderResult } from '../types'
import './shared'

export function prerender<T>(
  data: T,
  options?: PrerenderOptions,
  extraOptions?: {
    /**
     * @experimental
     */
    onClientReference?: (metadata: {
      id: string
      name: string
      deps: ResolvedAssetDeps
    }) => void
  },
): Promise<PrerenderResult> {
  return originalPrerender(data, options, {
    onClientReference(metadata) {
      const deps = assetsManifest.clientReferenceDeps[metadata.id] ?? {
        js: [],
        css: [],
      }
      extraOptions?.onClientReference?.({
        id: metadata.id,
        name: metadata.name,
        deps,
      })
    },
  })
}
