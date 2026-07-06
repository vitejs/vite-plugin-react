import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import type { ResolvedAssetDeps } from './plugin'
import { renderToPipeableStream as originalRenderToPipeableStream } from './react/rsc.node'
import type { PipeableStream } from './types'

export * from './rsc'

export function renderToPipeableStream<T>(
  data: T,
  options?: object,
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
): PipeableStream {
  return originalRenderToPipeableStream(data, options, {
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
