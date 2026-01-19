import { memoize } from '@hiogawa/utils'
import type { ServerConsumerManifest } from '../types'
import { removeReferenceCacheTag, setInternalRequire } from './shared'

let init = false

export function setRequireModule(options: {
  load: (id: string) => unknown
  /**
   * Called EVERY time a module is requested
   * @experimental
   */
  onLoad?: (id: string) => void
}): void {
  if (init) return
  init = true

  const requireModule = memoize((id: string) => {
    return options.load(removeReferenceCacheTag(id))
  })

  const clientRequire = (id: string) => {
    const cleanId = removeReferenceCacheTag(id)
    options.onLoad?.(cleanId)
    return requireModule(id)
  }
  ;(globalThis as any).__vite_rsc_client_require__ = clientRequire

  setInternalRequire()
}

export function createServerConsumerManifest(): ServerConsumerManifest {
  return {}
}
