import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/react-compiler'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import babel from '@rolldown/plugin-babel'
          import rsc from '@vitejs/plugin-rsc'
          import * as react from '@vitejs/plugin-react'
          import { defineConfig, mergeConfig, version } from 'vite'
          import baseConfig from './vite.config.base.ts'

          delete baseConfig.plugins

          const overrideConfig = defineConfig({
            plugins: version.startsWith('7.')
              ? [
                  react.default({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
                  rsc()
                ]
              : [
                  react.default(),
                  babel({ presets: [react.reactCompilerPreset()] }),
                  rsc(),
                ],
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('dev-react-compiler', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)

    test('verify react compiler', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      const res = await page.request.get(f.url('src/client.tsx'))
      expect(await res.text()).toContain('react.memo_cache_sentinel')
    })
  })

  test.describe('build-react-compiler', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
