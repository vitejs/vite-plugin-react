import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/single-entry'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/framework/entry.rsc.tsx': {
          edit: (s) => s.replace(`('ssr', 'index')`, `('ssr')`),
        },
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            environments: {
              rsc: {
                build: {
                  rollupOptions: {
                    input: './src/framework/entry.rsc.tsx'
                  },
                },
              },
              ssr: {
                build: {
                  rollupOptions: {
                    input: './src/framework/entry.ssr.tsx',
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

  test.describe('dev-single-entry', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build-single-entry', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
