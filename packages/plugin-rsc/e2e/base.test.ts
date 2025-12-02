import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture, type Fixture } from './fixture'
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
    const f2: Fixture = {
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    }
    defineStarterTest(f2)
    testRequestUrl(f2)
  })

  test.describe('build-base', () => {
    const f = useFixture({ root, mode: 'build' })
    const f2: Fixture = {
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    }
    defineStarterTest(f2)
    testRequestUrl(f2)
  })

  function testRequestUrl(f: Fixture) {
    test('request url', async ({ page }) => {
      await page.goto(f.url())
      await page.waitForSelector('#root')
      await expect(page.locator('.card').nth(2)).toHaveText(`Request URL: ${f.url()}`)
    })
  }
})
