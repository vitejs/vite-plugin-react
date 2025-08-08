import { test, expect, describe } from 'vitest'
import { cjsModuleRunnerPlugin, cjsModuleRunnerTransform } from './cjs'
import { createServer } from 'vite'

describe.skip(cjsModuleRunnerTransform, () => {
  test('basic', async () => {
    const input = `
exports.ok = true;
`
    const output = await cjsModuleRunnerTransform(input)
    expect(output).toMatchSnapshot()
    const server = await createServer({
      configFile: false,
      plugins: [
        {
          name: 'test-entry',
          resolveId(source) {
            if (source === 'virtual:test') {
              return '\0' + source
            }
          },
          load(id) {
            if (id === '\0virtual:test') {
              return output
            }
          },
        },
      ],
    })
    const mod = await server.ssrLoadModule('virtual:test')
    expect(mod).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })

  test('basic', async () => {
    const input = `
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/use-sync-external-store.production.js');
} else {
  module.exports = require('./cjs/use-sync-external-store.development.js');
}
`
    const output = await cjsModuleRunnerTransform(input, {
      define: {
        'process.env.NODE_ENV': JSON.stringify('development'),
      },
    })
    expect(output).toMatchSnapshot()
    const server = await createServer({
      configFile: false,
      plugins: [cjsModuleRunnerPlugin()],
    })
    const mod = await server.ssrLoadModule(
      'use-sync-external-store/shim/index.js',
    )
    expect(mod).toMatchInlineSnapshot(`
      {
        "useSyncExternalStore": [Function],
      }
    `)
  })
})
