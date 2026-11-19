// use special prefix to switch client/server reference loading inside __webpack_require__
export const SERVER_REFERENCE_PREFIX = '$$server:'

export const SERVER_DECODE_CLIENT_PREFIX = '$$decode-client:'

export const SERVER_REFERENCE_PRESERVE_PREFIX = '$$preserve:'

// cache bust memoized require promise during dev.
// tags increase, so a require can tell a newer render's reference from an older one's.
let lastReferenceCacheTag = Date.now()

export function createReferenceCacheTag(): string {
  return '$$cache=' + ++lastReferenceCacheTag
}

export function removeReferenceCacheTag(id: string): string {
  return id.split('$$cache=')[0]!
}

type ReferenceRequireEntry<T> = {
  tag: number
  value: T
  settledTag: number
  settled?: T
}

/**
 * Memoize a reference's require by its id, so React reads the same module
 * promise each time it requires a reference.
 *
 * During dev, ids end in the cache tag of the render that sent them. A newer
 * tag loads the module again, so an edited module is picked up. An older tag,
 * from a render still in progress, gets the latest load that has settled, so
 * React can still read that render's modules synchronously. Only the latest
 * load and the last settled one are kept per reference, not one per render.
 */
export function memoizeReferenceRequire<T>(
  load: (id: string) => T,
): (id: string) => T {
  const entries = new Map<string, ReferenceRequireEntry<T>>()
  return (id) => {
    const [base, tagString] = id.split('$$cache=') as [string, string?]
    const tag = tagString === undefined ? 0 : Number(tagString)
    const entry = entries.get(base)
    if (entry && tag <= entry.tag) {
      return tag === entry.tag ? entry.value : (entry.settled ?? entry.value)
    }
    const value = load(id)
    const next: ReferenceRequireEntry<T> = {
      tag,
      value,
      settledTag: entry?.settledTag ?? -1,
      settled: entry?.settled,
    }
    entries.set(base, next)
    const settle = () => {
      const current = entries.get(base)
      if (current && tag > current.settledTag) {
        current.settledTag = tag
        current.settled = value
      }
    }
    if (isThenable(value)) {
      // track the state the way React does, so a settled load can be read
      // synchronously by a render that didn't start it.
      value.then(
        (result) => {
          Object.assign(value, { status: 'fulfilled', value: result })
          settle()
        },
        (reason) => {
          Object.assign(value, { status: 'rejected', reason })
          settle()
        },
      )
    } else {
      settle()
    }
    return value
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  )
}

export function setInternalRequire(): void {
  // branch client and server require to support the case when ssr and rsc share the same global
  ;(globalThis as any).__vite_rsc_require__ = (id: string) => {
    if (id.startsWith(SERVER_REFERENCE_PREFIX)) {
      id = id.slice(SERVER_REFERENCE_PREFIX.length)
      return (globalThis as any).__vite_rsc_server_require__(id)
    }
    return (globalThis as any).__vite_rsc_client_require__(id)
  }
}
