import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { expectNoReload, waitForHydration } from './helper'
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

    // TODO: move css hmr test to `starter.ts`
    test('css hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      const card = page.locator('.card').nth(0)

      await using _ = await expectNoReload(page)
      const editor = f.createEditor('src/index.css')
      editor.edit((s) =>
        s.replace(
          '.card {\n  padding: 1rem;',
          `.card {\n  padding: 1rem; background-color: rgb(255, 0, 200);`,
        ),
      )
      await expect(card).toHaveCSS('background-color', 'rgb(255, 0, 200)')

      editor.reset()
      await expect(card).not.toHaveCSS('background-color', 'rgb(255, 0, 200)')
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
