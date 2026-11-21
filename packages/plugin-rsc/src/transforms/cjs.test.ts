import path from 'node:path'
import { createServer, createServerModuleRunner, parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { transformCjsToEsm } from './cjs'

describe(transformCjsToEsm, () => {
  it('loads CommonJS modules, including partial exports in a cycle', async () => {
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
    const circularModule = await runner.import('/cycle-a.cjs')
    expect(circularModule.default).toEqual({
      phase: 'after requiring B',
      capturedByB: { phase: 'before requiring B' },
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
          "__cjs_module_runner_get_exports": [Function],
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
