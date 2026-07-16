import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration,
} from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/ppr', mode: 'dev' })
  definePprTest(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/ppr', mode: 'build' })
  definePprTest(f)
})

function definePprTest(f: Fixture) {
  test('hydrate and navigate', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())

    await expect(page.getByTestId('static')).toContainText('Static shell:')
    await expect(page.getByTestId('dynamic')).toContainText(
      'Request data: (none)',
    )
    await expect(page.getByTestId('fallback')).toBeHidden()
    await waitForHydration(page)

    const counter = page.getByTestId('counter')
    await counter.click()
    await expect(counter).toHaveText('Count is 1')

    await using _noReload = await expectNoReload(page)
    await page.getByRole('link', { name: 'Navigate with RSC' }).click()
    await expect(page).toHaveURL(f.url('?navigation=1'))
    await expect(page.getByTestId('dynamic')).toContainText(
      'Request data: ?navigation=1',
    )
    await expect(counter).toHaveText('Count is 1')
  })

  testNoJs('static shell', async ({ page }) => {
    await page.goto(f.url())
    await expect(page.getByTestId('static')).toContainText('Static shell:')
    await expect(page.getByTestId('fallback')).toBeVisible()

    if (f.mode === 'build') {
      const staticTimestamp = await page.getByTestId('static').textContent()
      const dynamicTimestamp = await page.getByTestId('dynamic').textContent()

      await page.reload()
      await expect(page.getByTestId('dynamic')).not.toHaveText(
        dynamicTimestamp!,
      )
      await expect(page.getByTestId('static')).toHaveText(staticTimestamp!)
    }
  })
}
