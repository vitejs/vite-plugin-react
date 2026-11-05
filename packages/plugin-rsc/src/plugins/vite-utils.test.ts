import { describe, expect, it } from 'vitest'
import { parseRequestUrl } from './vite-utils'

describe(parseRequestUrl, () => {
  it('parses normal request urls', () => {
    expect(parseRequestUrl('/')?.pathname).toBe('/')
    expect(
      parseRequestUrl('/__vite_rsc_findSourceMapURL?filename=a')?.pathname,
    ).toBe('/__vite_rsc_findSourceMapURL')
    expect(parseRequestUrl(undefined)?.pathname).toBe('/')
  })

  it('returns undefined instead of throwing for unparseable request urls', () => {
    // A request to `//` is valid HTTP but `new URL('//', base)` throws
    // ERR_INVALID_URL. An uncaught throw inside an async Connect middleware
    // becomes an unhandled rejection and kills the dev server, so the
    // middleware skips to `next()` on undefined instead.
    expect(parseRequestUrl('//')).toBeUndefined()
    expect(parseRequestUrl('//[')).toBeUndefined()
  })
})
