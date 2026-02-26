import { describe, expect, it } from 'vitest'
import vitePluginRscCore from './plugin'

describe('rsc:patch-react-server-dom-webpack', () => {
  function getHandler() {
    const plugins = vitePluginRscCore()
    const plugin = plugins.find(
      (p) => p.name === 'rsc:patch-react-server-dom-webpack',
    )!
    return (plugin.transform as { handler: (...args: any[]) => any }).handler
  }

  it('preserves sourcemap chain when replacing __webpack_require__', () => {
    const handler = getHandler()
    const code = 'const x = __webpack_require__("test");\n'
    const result = handler(code, '/test.js')

    expect(result).toBeDefined()
    expect(result.code).toContain('__vite_rsc_require__')
    expect(result.code).not.toContain('__webpack_require__')

    // The transform MUST return a valid sourcemap (not null) to keep the
    // Rollup sourcemap chain intact.  Returning `map: null` silently breaks
    // downstream error-location resolution, causing Rollup to emit
    // "Can't resolve original location of error" for every module that
    // passes through this transform.
    expect(result.map).not.toBeNull()
    expect(result.map).toHaveProperty('mappings')
    expect(result.map.mappings).toBeTruthy()
  })

  it('preserves sourcemap chain when replacing __webpack_require__.u', () => {
    const handler = getHandler()
    const code = 'const u = __webpack_require__.u;\n'
    const result = handler(code, '/test.js')

    expect(result).toBeDefined()
    expect(result.code).toContain('({}).u')
    expect(result.map).not.toBeNull()
    expect(result.map).toHaveProperty('mappings')
    expect(result.map.mappings).toBeTruthy()
  })

  it('handles both patterns in the same source', () => {
    const handler = getHandler()
    const code = [
      'const u = __webpack_require__.u;',
      'const x = __webpack_require__("test");',
      '',
    ].join('\n')
    const result = handler(code, '/test.js')

    expect(result).toBeDefined()
    expect(result.code).toContain('({}).u')
    expect(result.code).toContain('__vite_rsc_require__')
    expect(result.code).not.toContain('__webpack_require__')
    expect(result.map).not.toBeNull()
    expect(result.map).toHaveProperty('mappings')
    expect(result.map.mappings).toBeTruthy()
  })

  it('returns undefined when no __webpack_require__ is present', () => {
    const handler = getHandler()
    const result = handler('const x = 1;\n', '/test.js')
    expect(result).toBeUndefined()
  })
})
