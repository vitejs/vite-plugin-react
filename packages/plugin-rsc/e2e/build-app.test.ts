import { test, expect } from '@playwright/test'
import { x } from 'tinyexec'

import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('buildApp hook', () => {
  const root = 'examples/e2e/temp/buildApp'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
            import rsc from '@vitejs/plugin-rsc'
            import react from '@vitejs/plugin-react'
            import { defineConfig, mergeConfig } from 'vite'
            import baseConfig from './vite.config.base.ts'
            
            delete baseConfig.plugins

            const overrideConfig = defineConfig({
              plugins: [
                {
                  name: 'buildApp-prafter',
                  buildApp: async () => {
                    console.log('++++ buildApp:before ++++')
                  },
                },
                rsc({
                  useBuildAppHook: process.env.TEST_USE_BUILD_APP_HOOK === 'true',
                }),
                {
                  name: 'buildApp-after',
                  buildApp: async () => {
                    console.log('++++ buildApp:after ++++')
                  },
                },
                react(),
              ],
            })

            export default mergeConfig(baseConfig, overrideConfig)
          `,
      },
    })
  })

  function verifyMatchOrder(s: string, matches: string[]) {
    const found = matches
      .map((match) => ({ match, index: s.indexOf(match) }))
      .filter((item) => item.index !== -1)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.match)
    expect(found).toEqual(matches)
  }

  test('useBuildAppHook: true', async () => {
    const result = await x('pnpm', ['build'], {
      nodeOptions: {
        cwd: root,
        env: {
          TEST_USE_BUILD_APP_HOOK: 'true',
        },
      },
      throwOnError: true,
    })
    verifyMatchOrder(result.stdout, [
      '++++ buildApp:before ++++',
      'for production...',
      '++++ buildApp:after ++++',
    ])
    expect(result.exitCode).toBe(0)
  })

  test('useBuildAppHook: false', async () => {
    const result = await x('pnpm', ['build'], {
      nodeOptions: {
        cwd: root,
        env: {
          TEST_USE_BUILD_APP_HOOK: 'false',
        },
      },
      throwOnError: true,
    })
    verifyMatchOrder(result.stdout, [
      '++++ buildApp:before ++++',
      '++++ buildApp:after ++++',
      'for production...',
    ])
    expect(result.exitCode).toBe(0)
  })

  test.describe('build', () => {
    const f = useFixture({
      root,
      mode: 'build',
      cliOptions: {
        env: {
          TEST_USE_BUILD_APP_HOOK: 'true',
        },
      },
    })

    test('basic', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
    })
  })
})
