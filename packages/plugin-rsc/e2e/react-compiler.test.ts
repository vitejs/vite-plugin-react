import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { x } from 'tinyexec'
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
          import react, { reactCompilerPreset } from '@vitejs/plugin-react'
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          delete baseConfig.plugins

          const overrideConfig = defineConfig({
            plugins: [
              react(),
              babel({ presets: [reactCompilerPreset()] }),
              rsc(),
            ],
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
    const { version } = JSON.parse(
      readFileSync(
        new URL(
          '../package.json',
          import.meta.resolve('@rolldown/plugin-babel'),
        ),
        'utf-8',
      ),
    )
    await x('pnpm', ['i', `@rolldown/plugin-babel@${version}`], {
      throwOnError: true,
      nodeOptions: {
        cwd: root,
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
