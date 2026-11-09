// use special prefix to switch client/server reference loading inside __webpack_require__
export const SERVER_REFERENCE_PREFIX = '$$server:'

export const SERVER_DECODE_CLIENT_PREFIX = '$$decode-client:'

export const SERVER_REFERENCE_PRESERVE_PREFIX = '$$preserve:'

// cache bust memoized require promise during dev
export function createReferenceCacheTag(): string {
  const cache = Math.random().toString(36).slice(2)
  return '$$cache=' + cache
}

export function removeReferenceCacheTag(id: string): string {
  return id.split('$$cache=')[0]!
}

// how many cache tags `memoizeReferenceRequire` keeps entries for
export const REFERENCE_CACHE_TAG_LIMIT = 64

// Memoize a reference `require` so it returns a stable promise for an id, as
// `__webpack_require__` must: React checks `status` on the promise it got from
// preloading a module when it later requires the same id.
//
// During dev each manifest tags its ids with a fresh cache tag, which makes
// every render a new set of keys. Memoizing on the tagged id alone never
// evicts, and every entry holds a promise created inside the request that
// first loaded it, so each render's request stays reachable for the life of
// the server. Entries are therefore grouped by tag, and only the most recently
// used `limit` tags are kept. Untagged ids (build) are memoized forever.
export function memoizeReferenceRequire<T>(
  fn: (id: string) => T,
  limit: number = REFERENCE_CACHE_TAG_LIMIT,
): (id: string) => T {
  const untagged = new Map<string, T>()
  // insertion order is recency: a tag is moved to the end on every use
  const tagged = new Map<string, Map<string, T>>()
  return (id) => {
    const tagStart = id.indexOf('$$cache=')
    let cache: Map<string, T>
    if (tagStart === -1) {
      cache = untagged
    } else {
      const tag = id.slice(tagStart)
      cache = tagged.get(tag) ?? new Map()
      tagged.delete(tag)
      tagged.set(tag, cache)
      if (tagged.size > limit) {
        tagged.delete(tagged.keys().next().value!)
      }
    }
    if (cache.has(id)) {
      return cache.get(id)!
    }
    const value = fn(id)
    cache.set(id, value)
    return value
  }
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
