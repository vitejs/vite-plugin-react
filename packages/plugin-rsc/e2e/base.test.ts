import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/base'

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
            base: '/custom-base/',
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('dev-base', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest({
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    })
  })

  test.describe('build-base', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest({
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    })
  })
})
