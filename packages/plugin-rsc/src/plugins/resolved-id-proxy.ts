import type { Plugin } from 'vite'

// Resolved ID proxy plugin
// This enables virtual modules (with \0 prefix) to be used in import specifiers
// and handles ?direct query for CSS requests in dev mode.
// See .dev-notes/dist/virtual-module-e2e-test-plan.md for details.
//
// Input/Output examples:
//
//   toResolvedIdProxy("\0virtual:test.css")
//     => "virtual:vite-rsc/resolved-id/__x00__virtual:test.css"
//
//   fromResolvedIdProxy("virtual:vite-rsc/resolved-id/__x00__virtual:test.css")
//     => "\0virtual:test.css"
//
//   fromResolvedIdProxy("virtual:vite-rsc/resolved-id/__x00__virtual:test.css?direct")
//     => "\0virtual:test.css"

const RESOLVED_ID_PROXY_PREFIX = 'virtual:vite-rsc/resolved-id/'
const NULL_BYTE_PLACEHOLDER = '__x00__'

export function toResolvedIdProxy(resolvedId: string): string {
  const encoded = resolvedId.replace(/\0/g, NULL_BYTE_PLACEHOLDER)
  return RESOLVED_ID_PROXY_PREFIX + encoded
}

export function fromResolvedIdProxy(source: string): string | undefined {
  // Strip query params (e.g., ?direct added by Vite for CSS)
  const clean = source.split('?')[0]!
  if (!clean.startsWith(RESOLVED_ID_PROXY_PREFIX)) {
    return undefined
  }
  const encoded = clean.slice(RESOLVED_ID_PROXY_PREFIX.length)
  return encoded.replace(new RegExp(NULL_BYTE_PLACEHOLDER, 'g'), '\0')
}

/**
 * Vite plugin that resolves proxy import specifiers to the original resolved IDs.
 */
export function vitePluginResolvedIdProxy(): Plugin {
  return {
    name: 'rsc:resolved-id-proxy',
    resolveId(source) {
      const originalId = fromResolvedIdProxy(source)
      if (originalId !== undefined) {
        return originalId
      }
    },
  }
}
