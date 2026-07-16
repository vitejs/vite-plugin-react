import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import type {
  ClientReferenceMetadata,
  CreateClientManifestOptions,
} from '../core/rsc'
import type { ResolvedAssetDeps } from '../plugin'

export interface ClientReferenceOptions {
  /**
   * @experimental
   */
  onClientReference?: (
    metadata: ClientReferenceMetadata & { deps: ResolvedAssetDeps },
  ) => void
}

export function createOnClientReference(
  options?: ClientReferenceOptions,
): NonNullable<CreateClientManifestOptions['onClientReference']> {
  return (metadata) => {
    const deps = assetsManifest.clientReferenceDeps[metadata.id] ?? {
      js: [],
      css: [],
    }
    options?.onClientReference?.({ ...metadata, deps })
  }
}
