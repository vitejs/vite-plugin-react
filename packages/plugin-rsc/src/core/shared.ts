// use special prefix to switch client/server reference loading inside __webpack_require__
export const SERVER_REFERENCE_PREFIX = '$$server:'

export const SERVER_DECODE_CLIENT_PREFIX = '$$decode-client:'

// cache bust memoized require promise during dev
export function createReferenceCacheTag(): string {
  const cache = Math.random().toString(36).slice(2)
  return '$$cache=' + cache
}

export function removeReferenceCacheTag(id: string): string {
  return id.split('$$cache=')[0]!
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
