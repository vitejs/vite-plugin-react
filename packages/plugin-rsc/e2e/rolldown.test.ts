import { test } from '@playwright/test'
import * as vite from 'vite'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('rolldownOptions', () => {
  test.skip(!('rolldownVersion' in vite), 'rolldown only')

  const root = 'examples/e2e/temp/rolldown-options'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (s) => s.replace(/rollupOptions/g, 'rolldownOptions'),
        },
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})

// With `output.strictExecutionOrder`, rolldown can emit the client `index`
// entry as an empty facade (no `moduleIds`) that imports a shared chunk.
test.describe('strict-execution-order', () => {
  test.skip(!('rolldownVersion' in vite), 'rolldown only')

  const root = 'examples/e2e/temp/strict-execution-order'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          export default mergeConfig(
            baseConfig,
            defineConfig({
              environments: {
                client: {
                  build: {
                    rollupOptions: {
                      output: { strictExecutionOrder: true },
                    },
                  },
                },
              },
            }),
          )
        `,
      },
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
