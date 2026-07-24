import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import type { ClientReferenceMetadata } from '../core/rsc'
import type { ResolvedAssetDeps } from '../plugin'

export type OnClientReference = (
  metadata: ClientReferenceMetadata & { deps: ResolvedAssetDeps },
) => void

export function createOnClientReference(
  onClientReference: OnClientReference,
): (metadata: ClientReferenceMetadata) => void {
  return (metadata: ClientReferenceMetadata) => {
    const deps = assetsManifest.clientReferenceDeps[metadata.id] ?? {
      js: [],
      css: [],
    }
    onClientReference({ ...metadata, deps })
  }
}
