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

    await expect(page.getByTestId('static')).toContainText('[rendered at ')
    await expect(page.getByTestId('cached-static')).toContainText(
      '[rendered at ',
    )
    await expect(page.getByTestId('cached-fallback')).toBeHidden()
    await expect(page.getByTestId('dynamic')).toContainText('Requested URL: /')
    await expect(page.getByTestId('fallback')).toBeHidden()
    await waitForHydration(page)

    const counter = page.getByTestId('counter')
    await counter.click()
    await expect(counter).toHaveText('Count is 1')

    await using _noReload = await expectNoReload(page)
    await page.getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveURL(f.url('/about'))
    await expect(page.getByText('This is the about page.')).toBeVisible()
    await expect(page.getByTestId('dynamic')).toContainText(
      'Requested URL: /about',
    )
    await expect(counter).toHaveText('Count is 1')
  })

  testNoJs('static shell', async ({ page }) => {
    await page.goto(f.url('/about'))
    await expect(page.getByText('This is the about page.')).toBeVisible()
    await expect(page.getByTestId('static')).toContainText('[rendered at ')
    await expect(page.getByTestId('cached-static')).toContainText(
      '[rendered at ',
    )
    await expect(page.getByTestId('cached-fallback')).toBeHidden()
    await expect(page.getByTestId('fallback')).toBeVisible()
    await expect(page.getByTestId('dynamic')).toContainText(
      'Requested URL: /about',
    )

    if (f.mode === 'build') {
      const staticTimestamp = await page.getByTestId('static').textContent()
      const cachedTimestamp = await page
        .getByTestId('cached-static')
        .textContent()
      const dynamicTimestamp = await page.getByTestId('dynamic').textContent()

      await page.reload()
      await expect(page.getByTestId('dynamic')).not.toHaveText(
        dynamicTimestamp!,
      )
      await expect(page.getByTestId('static')).toHaveText(staticTimestamp!)
      await expect(page.getByTestId('cached-static')).toHaveText(
        cachedTimestamp!,
      )
    }
  })
}
