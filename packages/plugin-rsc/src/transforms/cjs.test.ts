import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { debugSourceMap } from './test-utils'
import { transformCjsToEsm } from './cjs'

describe(transformCjsToEsm, () => {
  async function testTransform(input: string) {
    const ast = await parseAstAsync(input)
    const { output } = transformCjsToEsm(input, ast)
    if (!output.hasChanged()) {
      return
    }
    if (process.env['DEBUG_SOURCEMAP']) {
      await debugSourceMap(output)
    }
    return output.toString()
  }

  it('basic', async () => {
    const input = `\
exports.ok = true;
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      exports.ok = true;
      "
    `)
  })

  it('top-level re-export', async () => {
    const input = `\
if (true) {
  module.exports = require('./cjs/use-sync-external-store.production.js');
} else {
  module.exports = require('./cjs/use-sync-external-store.development.js');
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      if (true) {
        module.exports = (await import('./cjs/use-sync-external-store.production.js'));
      } else {
        module.exports = (await import('./cjs/use-sync-external-store.development.js'));
      }
      "
    `)
  })

  it('non top-level re-export', async () => {
    const input = `\
"production" !== process.env.NODE_ENV && (function() { 
  var React = require("react");
  var ReactDOM = require("react-dom");
  exports.useSyncExternalStoreWithSelector = function () {}
})()
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      const __cjs_to_esm_hoist_1 = await import("react-dom");
      const __cjs_to_esm_hoist_0 = await import("react");
      "production" !== process.env.NODE_ENV && (function() { 
        var React = __cjs_to_esm_hoist_0;
        var ReactDOM = __cjs_to_esm_hoist_1;
        exports.useSyncExternalStoreWithSelector = function () {}
      })()
      "
    `)
  })

  it('local require', async () => {
    const input = `\
{
  const require = () => {};
  require("test");
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      {
        const require = () => {};
        require("test");
      }
      "
    `)
  })
})
