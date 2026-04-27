import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('cssLinkPrecedence-false', () => {
  const root = 'examples/e2e/temp/cssLinkPrecedence-false'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            rsc: {
              cssLinkPrecedence: false,
            },
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
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
