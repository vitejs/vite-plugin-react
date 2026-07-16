import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import type { ResolvedAssetDeps } from '../plugin'
import { renderToReadableStream as originalRenderToReadableStream } from '../react/rsc/server'
import './shared'

export {
  createClientManifest,
  createServerManifest,
  loadServerAction,
} from '../core/rsc'

export * from '../react/rsc/server'

export function renderToReadableStream<T>(
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
): ReadableStream<Uint8Array> {
  return originalRenderToReadableStream(data, options, {
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
