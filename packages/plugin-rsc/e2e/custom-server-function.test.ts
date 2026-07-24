import { expect, test, type Page } from '@playwright/test'
import { useFixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration,
} from './helper'

test.describe('dev-custom-server-function', () => {
  const f = useFixture({
    root: 'examples/custom-server-function',
    mode: 'dev',
  })
  defineTest(f)

  test('updates directive ownership', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await using _noReload = await expectNoReload(page)

    const editor = f.createEditor('src/features/mixed-directives/actions.ts')
    editor.edit((source) =>
      source
        .replace(`'use custom-server'`, `'use server'`)
        .replace(`customLabel = 'Custom'`, `customLabel = 'Built-in owned'`)
        .replace('customCount++', 'customCount += 10'),
    )

    await expect(
      page.getByRole('button', { name: 'Built-in owned: 0' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Built-in: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Built-in owned: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in owned: 10' }),
    ).toBeVisible()

    editor.reset()
    await expect(page.getByRole('button', { name: 'Custom: 0' })).toBeVisible()
    await page.getByRole('button', { name: 'Built-in: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Custom: 0' }).click()
    await expect(page.getByRole('button', { name: 'Custom: 1' })).toBeVisible()
  })
})

test.describe('build-custom-server-function', () => {
  const f = useFixture({
    root: 'examples/custom-server-function',
    mode: 'build',
  })
  defineTest(f)
})

function defineTest(f: ReturnType<typeof useFixture>) {
  test('built-in and custom server functions', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await testActions(page)
  })

  testNoJs('progressive forms', async ({ page }) => {
    await page.goto(f.url())
    await testActions(page)
  })

  async function testActions(page: Page) {
    await page.getByRole('button', { name: 'Built-in: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Custom: 0' }).click()
    await expect(page.getByRole('button', { name: 'Custom: 1' })).toBeVisible()

    await page.getByRole('button', { name: 'From client: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'From client: 1' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 0' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Custom: 0' })).toBeVisible()
  }
}
