import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/module-runner-hmr-false'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig, createRunnableDevEnvironment } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            environments: {
              ssr: {
                dev: {
                  createEnvironment(name, config) {
                    return createRunnableDevEnvironment(name, config, {
                      runnerOptions: {
                        hmr: false,
                      },
                    })
                  },
                },
              },
              rsc: {
                dev: {
                  createEnvironment(name, config) {
                    return createRunnableDevEnvironment(name, config, {
                      runnerOptions: {
                        hmr: false,
                      },
                    })
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

  test.describe('dev-module-runner-hmr-false', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })
})
