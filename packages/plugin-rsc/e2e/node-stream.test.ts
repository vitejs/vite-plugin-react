import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoPageError, testNoJs, waitForHydration } from './helper'

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

  test('server action', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await testServerAction(page)
  })

  testNoJs('server action without JavaScript', async ({ page }) => {
    await page.goto(f.url())
    await testServerAction(page)
  })
}

async function testServerAction(page: import('@playwright/test').Page) {
  const button = page.getByTestId('server-counter')
  const before = Number((await button.textContent())?.match(/\d+/)?.[0])
  await button.click()
  await expect(button).toHaveText(`Server count: ${before + 1}`)
}
