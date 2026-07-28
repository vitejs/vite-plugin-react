import path from 'node:path'
import { createServer, createServerModuleRunner, parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { transformCjsToEsm, type TransformCjsToEsmOptions } from './index'
import { debugSourceMap } from './test-utils'

describe(transformCjsToEsm, () => {
  async function testTransform(
    input: string,
    options: Partial<TransformCjsToEsmOptions> = {},
  ) {
    const ast = await parseAstAsync(input)
    const { output } = transformCjsToEsm(input, ast, {
      id: '/test.js',
      ...options,
    })
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
      "let __filename = "/test.js"; let __dirname = "/";
      let exports = {}; const module = { exports };
      exports.ok = true;

      ;__vite_ssr_exportAll__(module.exports);
      export default module.exports;
      export const __cjs_module_runner_transform = true;
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
      "let __filename = "/test.js"; let __dirname = "/";
      let exports = {}; const module = { exports };
      function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
      if (true) {
        module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.production.js')));
      } else {
        module.exports = (__cjs_interop__(await import('./cjs/use-sync-external-store.development.js')));
      }

      ;__vite_ssr_exportAll__(module.exports);
      export default module.exports;
      export const __cjs_module_runner_transform = true;
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
      "let __filename = "/test.js"; let __dirname = "/";
      let exports = {}; const module = { exports };
      function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
      const __cjs_to_esm_hoist_0 = __cjs_interop__(await import("react"));
      const __cjs_to_esm_hoist_1 = __cjs_interop__(await import("react-dom"));
      "production" !== process.env.NODE_ENV && (function() { 
        var React = __cjs_to_esm_hoist_0;
        var ReactDOM = __cjs_to_esm_hoist_1;
        exports.useSyncExternalStoreWithSelector = function () {}
      })()

      ;__vite_ssr_exportAll__(module.exports);
      export default module.exports;
      export const __cjs_module_runner_transform = true;
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
      "let __filename = "/test.js"; let __dirname = "/";
      let exports = {}; const module = { exports };
      function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
      const __cjs_to_esm_hoist_0 = __cjs_interop__(await import("te" + "st"));
      const __cjs_to_esm_hoist_1 = __cjs_interop__(await import("test"));
      const __cjs_to_esm_hoist_2 = __cjs_interop__(await import("test"));
      const x1 = (__cjs_interop__(await import("te" + "st")));
      const x2 = (__cjs_interop__(await import("test")))().test;
      console.log((__cjs_interop__(await import("test"))))

      function test() {
        const y1 = __cjs_to_esm_hoist_0;
        const y2 = __cjs_to_esm_hoist_1().test;
        consoe.log(__cjs_to_esm_hoist_2)
      }

      ;__vite_ssr_exportAll__(module.exports);
      export default module.exports;
      export const __cjs_module_runner_transform = true;
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
      "let __filename = "/test.js"; let __dirname = "/";
      let exports = {}; const module = { exports };
      {
        const require = () => {};
        require("test");
      }

      ;__vite_ssr_exportAll__(module.exports);
      export default module.exports;
      export const __cjs_module_runner_transform = true;
      "
    `)
  })

  it('emits standard ESM output with statically assigned named exports', async () => {
    const code = await testTransform(
      `exports.foo = 'ok'; module.exports.bar = 2;`,
      { output: 'esm' },
    )

    expect(code).not.toContain('__vite_ssr_exportAll__')
    expect(code).not.toContain('__cjs_module_runner_transform')

    const url = `data:text/javascript;base64,${Buffer.from(code!).toString('base64')}`
    const mod = await import(url)
    expect(Object.keys(mod)).toEqual(['bar', 'default', 'foo'])
    expect(mod.default).toEqual({ bar: 2, foo: 'ok' })
    expect(mod.foo).toBe('ok')
    expect(mod.bar).toBe(2)
  })

  it('keeps dynamic export names on the default export in ESM output', async () => {
    const code = await testTransform(
      `const name = 'foo'; exports[name] = 'ok';`,
      { output: 'esm' },
    )

    const url = `data:text/javascript;base64,${Buffer.from(code!).toString('base64')}`
    const mod = await import(url)
    expect(Object.keys(mod)).toEqual(['default'])
    expect(mod.default).toEqual({ foo: 'ok' })
  })

  it('supports null default exports in ESM output', async () => {
    const code = await testTransform(
      `exports.foo = 'old'; module.exports = null;`,
      {
        output: 'esm',
      },
    )

    const url = `data:text/javascript;base64,${Buffer.from(code!).toString('base64')}`
    const mod = await import(url)
    expect(mod.default).toBeNull()
    expect(mod.foo).toBeUndefined()
  })

  it('ignores assignments to shadowed CommonJS bindings', async () => {
    const code = await testTransform(
      `function set(exports) { exports.foo = 'local' } module.exports = set;`,
      { output: 'esm' },
    )

    expect(code).not.toContain('as foo')
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
              const { output } = transformCjsToEsm(code, ast, { id })
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
        "cjsGlobals": {
          "test": [
            "string",
            "string",
          ],
        },
        "depDefault": {
          "a": "a",
          "b": "b",
        },
        "depExports": {},
        "depFn": [Function],
        "depFnRequire": {
          "value": 3,
        },
        "depNamespace": {
          "__cjs_module_runner_transform": true,
          "a": "a",
          "b": "b",
          "default": {
            "a": "a",
            "b": "b",
          },
        },
        "depPrimitive": "[ok]",
        "dualLib": "ok",
        "testExternalFalsyPrimitive": {
          "ok": true,
        },
        "testNodeBuiltins": {
          "nodeEventsOk": true,
        },
      }
    `)
  })
})
