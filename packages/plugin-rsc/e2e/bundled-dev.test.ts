import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { expectNoPageError, expectNoReload, waitForHydration } from './helper'

test.describe('bundled dev', () => {
  const root = 'examples/e2e/temp/bundled-dev'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (source) =>
            source.replace(
              'export default defineConfig({',
              'export default defineConfig({\n  experimental: { bundledDev: true },',
            ),
        },
      },
    })
  })

  const fixture = useFixture({ root, mode: 'dev' })

  test('serves the initial bundled RSC app', async ({ page }) => {
    using _ = expectNoPageError(page)
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))

    await page.goto(fixture.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()

    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()
    await expect(page.locator('.card').first()).toHaveCSS(
      'padding-left',
      '16px',
    )
    await expect(page.getByAltText('React logo')).not.toHaveJSProperty(
      'naturalWidth',
      0,
    )
    expect(requests).toContain(fixture.url('assets/index.js'))
    expect(requests).not.toContain(
      fixture.url('src/framework/entry.browser.tsx'),
    )
  })

  test('keeps client HMR', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(fixture.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
    await using _ = await expectNoReload(page)

    const editor = fixture.createEditor('src/client.tsx')
    editor.edit((source) =>
      source.replace('Client Counter', 'Client [edit] Counter'),
    )
    await expect(
      page.getByRole('button', { name: 'Client [edit] Counter: 1' }),
    ).toBeVisible()

    editor.reset()
    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()
  })
})
