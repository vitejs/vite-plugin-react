import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev-custom-server-function', () => {
  const f = useFixture({
    root: 'examples/custom-server-function',
    mode: 'dev',
  })
  defineTest(f)
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

    await page.getByRole('button', { name: 'Built-in: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Custom: 0' }).click()
    await expect(page.getByRole('button', { name: 'Custom: 1' })).toBeVisible()
  })
}
