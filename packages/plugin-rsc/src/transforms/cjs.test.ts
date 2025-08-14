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
      const __cjs_to_esm_hoist_0 = await import("react");
      const __cjs_to_esm_hoist_1 = await import("react-dom");
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
const x1 = require("te" + "st");
const x2 = require("test")().test;
console.log(require("test"))

function test() {
  const y1 = require("te" + "st");
  const y2 = require("test")().test;
  consoe.log(require("test"))
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const exports = {}; const module = { exports };
      const __cjs_to_esm_hoist_0 = await import("te" + "st");
      const __cjs_to_esm_hoist_1 = await import("test");
      const __cjs_to_esm_hoist_2 = await import("test");
      const x1 = (await import("te" + "st"));
      const x2 = (await import("test"))().test;
      console.log((await import("test")))

      function test() {
        const y1 = __cjs_to_esm_hoist_0;
        const y2 = __cjs_to_esm_hoist_1().test;
        consoe.log(__cjs_to_esm_hoist_2)
      }
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
