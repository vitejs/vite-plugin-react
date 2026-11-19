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

// renders in progress at once that each keep the loads they were given.
const RECENT_REFERENCE_TAGS = 16

type ReferenceRequireEntry<T> = {
  // the loads of the latest tags, by tag
  loads: Map<number, T>
  fulfilledTag: number
  fulfilled?: T
}

/**
 * Memoize a reference's require by its id, so React reads the same module
 * promise each time a render requires a reference.
 *
 * During dev, ids end in the cache tag of the render that sent them, and each
 * tag loads the module again, so an edited module is picked up. The loads of
 * the latest tags are kept, so a render in progress keeps reading the promise
 * it preloaded. An older tag gets the last load that fulfilled. So a
 * reference keeps a few loads, not one per render.
 */
export function memoizeReferenceRequire<T>(
  load: (id: string) => T,
): (id: string) => T {
  const entries = new Map<string, ReferenceRequireEntry<T>>()
  return (id) => {
    const [base, tagString] = id.split('$$cache=') as [string, string?]
    const tag = tagString === undefined ? 0 : Number(tagString)
    const entry: ReferenceRequireEntry<T> = entries.get(base) ?? {
      loads: new Map(),
      fulfilledTag: -1,
    }
    entries.set(base, entry)
    const { loads } = entry
    if (loads.has(tag)) return loads.get(tag)!
    if (loads.size >= RECENT_REFERENCE_TAGS) {
      const oldest = Math.min(...loads.keys())
      if (tag < oldest) {
        return entry.fulfilled ?? loads.get(Math.max(...loads.keys()))!
      }
      loads.delete(oldest)
    }
    const value = load(id)
    loads.set(tag, value)
    const fulfill = () => {
      if (tag >= entry.fulfilledTag) {
        entry.fulfilledTag = tag
        entry.fulfilled = value
      }
    }
    if (isThenable(value)) {
      // track the state the way React does, so a load can be read
      // synchronously by a render that didn't start it.
      value.then(
        (result) => {
          Object.assign(value, { status: 'fulfilled', value: result })
          fulfill()
        },
        (reason) => {
          Object.assign(value, { status: 'rejected', reason })
        },
      )
    } else {
      fulfill()
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
