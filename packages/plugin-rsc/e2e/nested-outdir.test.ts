import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createBuilder } from 'vite'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/nested-outDir'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
import path from 'node:path'
import baseConfig from './vite.config.base.ts'

// Vite 7 resolves relative Rollup inputs from the Playwright worker's cwd.
for (const { build } of Object.values(baseConfig.environments)) {
  const { input } = build.rollupOptions
  input.index = path.resolve(import.meta.dirname, input.index)
}

// Modify baseConfig to use nested outDir (rsc inside ssr)
baseConfig.environments.rsc.build.outDir = './dist/server/rsc'
baseConfig.environments.ssr.build.outDir = './dist/server'

export default baseConfig
`,
      },
    })
  })

  test('builds concurrently with separate nested output directories', async () => {
    const bothStaged = Promise.withResolvers<void>()
    let staged = 0

    const createConcurrentBuilder = (outDir: string) =>
      createBuilder({
        root: path.resolve(root),
        environments: {
          client: { build: { outDir: `${outDir}/client` } },
          ssr: { build: { outDir: `${outDir}/server` } },
          rsc: { build: { outDir: `${outDir}/server/rsc` } },
        },
        plugins: [
          {
            name: 'wait-for-concurrent-builds',
            async buildStart() {
              // Both builds stage their RSC output before the client build starts.
              if (this.environment.name === 'client') {
                if (++staged === 2) {
                  bothStaged.resolve()
                }
                await bothStaged.promise
              }
            },
          },
        ],
      })

    const first = await createConcurrentBuilder('dist-first')
    const second = await createConcurrentBuilder('dist-second')
    await Promise.all([first.buildApp(), second.buildApp()])

    for (const outDir of ['dist-first', 'dist-second']) {
      expect(
        fs.existsSync(path.join(root, outDir, 'server/rsc/index.js')),
      ).toBe(true)
    }
  })

  test.describe('build-nested-outDir', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('verify nested outDir structure', () => {
      // RSC output exists inside SSR outDir
      expect(fs.existsSync(path.join(f.root, 'dist/server/rsc/index.js'))).toBe(
        true,
      )
      expect(
        fs.existsSync(
          path.join(f.root, 'dist/server/rsc/__vite_rsc_assets_manifest.js'),
        ),
      ).toBe(true)
      // SSR output exists
      expect(fs.existsSync(path.join(f.root, 'dist/server/index.js'))).toBe(
        true,
      )
      expect(
        fs.existsSync(
          path.join(f.root, 'dist/server/__vite_rsc_assets_manifest.js'),
        ),
      ).toBe(true)
    })
  })
})
