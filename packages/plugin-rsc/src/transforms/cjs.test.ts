import { createServer, createServerModuleRunner, parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { debugSourceMap } from './test-utils'
import { transformCjsToEsm } from './cjs'
import path from 'node:path'

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

  it('edge cases', async () => {
    const input = `\
const x = require("te" + "st");

function test() {
  const y = require("te" + "st");
}

require("test")();
require("test").test;
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      const __cjs_to_esm_hoist_0 = await import("te" + "st");
      const x = (await import("te" + "st"));

      function test() {
        const y = __cjs_to_esm_hoist_0;
      }

      (await import("test"))();
      (await import("test")).test;
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

  it('e2e', async () => {
    const server = await createServer({
      configFile: false,
      logLevel: 'error',
      root: path.join(import.meta.dirname, 'fixtures/cjs'),
      plugins: [
        {
          name: 'cjs-module-runner-transform',
          async transform(code, id) {
            if (id.endsWith('.cjs')) {
              const ast = await parseAstAsync(code)
              const { output } = transformCjsToEsm(code, ast)
              output.append(`
;__vite_ssr_exportAll__(module.exports);
export default module.exports;
`)
              return {
                code: output.toString(),
                map: output.generateMap({ hires: 'boundary' }),
              }
            }
          },
        },
      ],
    })
    const runner = createServerModuleRunner(server.environments.ssr, {
      hmr: false,
    })
    const mod = await runner.import('/entry.mjs')
    expect(mod).toMatchInlineSnapshot(`
      {
        "depDefault": {
          "a": "a",
          "b": "b",
        },
        "depNamespace": {
          "a": "a",
          "b": "b",
          "default": {
            "a": "a",
            "b": "b",
          },
        },
      }
    `)
  })
})
