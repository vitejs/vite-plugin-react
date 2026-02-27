import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { x } from 'tinyexec'
import { setupIsolatedFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'
import { defineStarterTest } from './starter'

test.describe(() => {
  // use RUNNER_TEMP on Github Actions
  // https://github.com/actions/toolkit/issues/518
  const tmpRoot = path.join(
    process.env['RUNNER_TEMP'] || os.tmpdir(),
    'test-vite-rsc-react-compiler',
  )

  test.beforeAll(async () => {
    await setupIsolatedFixture({
      src: 'examples/starter',
      dest: tmpRoot,
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
    {
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
          cwd: tmpRoot,
        },
      })
    }
    {
      const {
        default: { version },
      } = await import('babel-plugin-react-compiler/package.json', {
        with: { type: 'json' },
      })
      await x('pnpm', ['i', `babel-plugin-react-compiler@${version}`], {
        throwOnError: true,
        nodeOptions: {
          cwd: tmpRoot,
        },
      })
    }
  })

  test.describe('dev-react-compiler', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)

    test('verify react compiler', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      const res = await page.request.get(f.url('src/client.tsx'))
      expect(await res.text()).toContain('react.memo_cache_sentinel')
    })
  })

  test.describe('build-react-compiler', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})
