import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'dev' })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'build' })
  defineTests(f)
})

function defineTests(f: ReturnType<typeof useFixture>) {
  test('basic render', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('h1')).toHaveText('RSC Node Stream')
    await expect(page.locator('[data-testid="url"]')).toContainText('URL: /')
  })

  test('client component hydration', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const button = page.locator('[data-testid="counter"]')
    await expect(button).toHaveText('Count: 0')
    await button.click()
    await expect(button).toHaveText('Count: 1')
  })
}
