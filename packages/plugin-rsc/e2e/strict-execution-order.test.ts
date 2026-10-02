import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import * as vite from 'vite'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

// With `output.strictExecutionOrder`, rolldown keeps the client entry's
// modules out of the `index` chunk when they are shared with client reference
// chunks, leaving `index` as an empty facade that only imports and runs them.
// The facade has no `moduleIds`, so the client entry must not be resolved via
// module id -> chunk lookups.
test.describe('strict-execution-order', () => {
  test.skip(!('rolldownVersion' in vite), 'rolldown only')

  const root = 'examples/e2e/temp/strict-execution-order'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            plugins: [
              {
                name: 'test:record-client-entry-shape',
                applyToEnvironment: (environment) => environment.name === 'client',
                generateBundle(_options, bundle) {
                  const entry = Object.values(bundle).find(
                    (output) => output.type === 'chunk' && output.isEntry && output.name === 'index',
                  )
                  this.emitFile({
                    type: 'asset',
                    fileName: 'test-client-entry-shape.json',
                    source: JSON.stringify(
                      entry && {
                        fileName: entry.fileName,
                        moduleIds: entry.moduleIds,
                        imports: entry.imports,
                      },
                    ),
                  })
                },
              },
            ],
            environments: {
              client: {
                build: {
                  rollupOptions: {
                    output: {
                      strictExecutionOrder: true,
                    },
                  },
                },
              },
            },
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('client entry facade is the bootstrap entry', () => {
      const entry = JSON.parse(
        fs.readFileSync(
          path.join(f.root, 'dist/client/test-client-entry-shape.json'),
          'utf-8',
        ),
      )
      // guard: the fixture must actually produce an empty facade entry
      expect(entry.moduleIds).toEqual([])
      expect(entry.imports.length).toBeGreaterThan(0)

      const manifest = JSON.parse(
        fs
          .readFileSync(
            path.join(f.root, 'dist/ssr/__vite_rsc_assets_manifest.js'),
            'utf-8',
          )
          .slice('export default '.length),
      )
      expect(manifest.clientEntryUrl).toBe(`/${entry.fileName}`)
      expect(manifest.clientEntryDeps.js).toEqual(
        expect.arrayContaining([
          `/${entry.fileName}`,
          ...entry.imports.map((fileName: string) => `/${fileName}`),
        ]),
      )
    })
  })
})
