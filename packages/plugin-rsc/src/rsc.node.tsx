import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import serverReferences from 'virtual:vite-rsc/server-references'
import { setRequireModule } from './core/rsc'
import type { ResolvedAssetDeps } from './plugin'
import { toReferenceValidationVirtual } from './plugins/shared'
import { renderToPipeableStream as originalRenderToPipeableStream } from './react/rsc.node'
import type { PipeableStream } from './react/rsc.node'

export {
  createClientManifest,
  createServerManifest,
  loadServerAction,
} from './core/rsc'

export {
  encryptActionBoundArgs,
  decryptActionBoundArgs,
} from './utils/encryption-runtime'

export * from './react/rsc.node'

initialize()

function initialize(): void {
  setRequireModule({
    load: async (id) => {
      if (!import.meta.env.__vite_rsc_build__) {
        await import(
          /* @vite-ignore */ '/@id/__x00__' +
            toReferenceValidationVirtual({ id, type: 'server' })
        )
        return import(/* @vite-ignore */ id)
      } else {
        const import_ = serverReferences[id]
        if (!import_) {
          throw new Error(`server reference not found '${id}'`)
        }
        return import_()
      }
    },
  })
}

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
