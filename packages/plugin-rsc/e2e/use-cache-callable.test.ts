import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/use-cache-callable', mode: 'dev' })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/use-cache-callable', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  test('calls the exported cache wrapper', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)

    const example = page.getByTestId('callable-cache')
    await expect(example.locator('span')).toHaveText(
      'requests: 0; result: none',
    )
    await example.getByRole('button', { name: 'same' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: captured:same:1',
    )
    await example.getByRole('button', { name: 'same' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: captured:same:1',
    )
    await example.getByRole('button', { name: 'different' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 3; result: captured:different:2',
    )
  })
}
