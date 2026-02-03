import { prefixRegex } from '@rolldown/pluginutils'
import type { Plugin } from 'vite'

// Resolved ID proxy plugin
// This enables virtual modules (with \0 prefix) to be used in import specifiers.
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
//
/*
Known Vite limitation: Virtual CSS modules don't work with ?direct or ?inline queries.

## Standard virtual module pattern

Vite/Rollup virtual modules use a \0 prefix to indicate resolved IDs that
don't correspond to real files. Example from examples/basic/vite.config.ts:

  resolveId(source) {
    if (source === 'virtual:test-style-server.css') {
      return `\0${source}`  // → \0virtual:test-style-server.css
    }
  },
  load(id) {
    if (id === '\0virtual:test-style-server.css') {
      return `.test { color: red; }`
    }
  }

Browsers can't use \0 (null byte) in URLs, so Vite encodes it as __x00__:
  <link href="/@id/__x00__virtual:test-style-server.css">

Vite's dev server maps /@id/__x00__... back to \0... internally.

## How Vite's ?direct CSS mechanism works

When a browser requests CSS via <link href="xxx.css">, Vite's dev server
middleware (transform.ts) detects the Accept: text/css header and injects
a ?direct query parameter:

  Browser: <link href="xxx.css" />
           ↓
  Middleware: xxx.css -> xxx.css?direct (based on Accept: text/css header)
           ↓
  transformRequest(url) where url = "xxx.css?direct"
           ↓
  Plugin Pipeline: resolveId → load → transform

In the CSS plugin's transform hook (css.ts:577-579), the ?direct query
signals that raw CSS should be returned instead of a JS wrapper:

  transform(code, id) {
    if (isDirectCSSRequest(id)) {
      return null  // Let CSS pass through unchanged
    }
    // Otherwise, wrap CSS in JS with HMR code
  }

## Why virtual modules break with ?direct (and ?inline)

Standard virtual module plugins use exact string matching:

  resolveId(source) {
    if (source === 'virtual:test-style-server.css') {  // exact match
      return `\0${source}`
    }
  }

When Vite middleware adds ?direct (or user imports with ?inline), the source
becomes 'virtual:test-style-server.css?direct' which doesn't match.

For virtual CSS modules, the flow becomes:

  1. Browser: <link href="/@id/__x00__virtual:test-style-server.css">
  2. Vite maps /@id/__x00__... → \0...
  3. Middleware: injects ?direct → "\0virtual:test-style-server.css?direct"
  4. resolveId("\0virtual:test-style-server.css?direct") → no match, unresolved!
  5. Load fails or returns wrong content

## Why regular CSS files work

For actual files like /src/style.css?direct, Vite/Rolldown has a fallback:
when resolveId/load fails with query params, it retries with query stripped.
So /src/style.css?direct eventually resolves to the file /src/style.css.

Virtual modules don't benefit from this fallback because they rely on
exact string matching in user plugins, not filesystem resolution.

## Conclusion

This is a Vite limitation. The fix would require Vite to either:
1. Provide a query-aware virtual module resolution helper, OR
2. Apply the query-stripping fallback to virtual modules too

Workaround: User plugins can manually handle queries by stripping them in
resolveId and load hooks. See examples/basic/vite.config.ts for patterns.
*/

const RESOLVED_ID_PROXY_PREFIX = 'virtual:vite-rsc/resolved-id/'

export function toResolvedIdProxy(resolvedId: string): string {
  return RESOLVED_ID_PROXY_PREFIX + encodeURIComponent(resolvedId)
}

export function withResolvedIdProxy(resolvedId: string): string {
  return resolvedId.startsWith('\0')
    ? toResolvedIdProxy(resolvedId)
    : resolvedId
}

export function fromResolvedIdProxy(source: string): string | undefined {
  if (!source.startsWith(RESOLVED_ID_PROXY_PREFIX)) {
    return undefined
  }
  // Strip query params (e.g., ?direct added by Vite for CSS)
  const clean = source.split('?')[0]!
  return decodeURIComponent(clean.slice(RESOLVED_ID_PROXY_PREFIX.length))
}

/**
 * Vite plugin that resolves proxy import specifiers to the original resolved IDs.
 */
export function vitePluginResolvedIdProxy(): Plugin {
  return {
    name: 'rsc:resolved-id-proxy',
    resolveId: {
      filter: { id: prefixRegex(RESOLVED_ID_PROXY_PREFIX) },
      handler(source) {
        const originalId = fromResolvedIdProxy(source)
        if (originalId !== undefined) {
          return originalId
        }
      },
    },
  }
}
