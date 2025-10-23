import { removeReferenceCacheTag, setInternalRequire } from './shared'
import { memoize } from '@hiogawa/utils'

let init = false

export function setRequireModule(options: {
  load: (id: string) => Promise<unknown>
}): void {
  if (init) return
  init = true

  const requireModule = memoize((id: string) => {
    return options.load(removeReferenceCacheTag(id))
  })

  ;(globalThis as any).__vite_rsc_client_require__ = requireModule

  setInternalRequire()
}
