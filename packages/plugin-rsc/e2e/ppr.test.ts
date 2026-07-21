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
  test('hydrate and navigate with static shell', async ({ browser, page }) => {
    // Capture the server-rendered shell before hydration.
    const noJsContext = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await noJsContext.newPage()
    await noJsPage.goto(f.url())
    const layoutHtml = await noJsPage.getByTestId('layout').textContent()
    const cachedAsyncHtml = await noJsPage
      .getByTestId('cached-async')
      .textContent()
    await noJsContext.close()

    using _ = expectNoPageError(page)
    await page.goto(f.url())

    // The document contains resolved static work and resumed dynamic content.
    await expect(page.getByTestId('layout')).toContainText('[rendered at ')
    await expect(page.getByTestId('cached-async')).toContainText(
      '[rendered at ',
    )
    await expect(page.getByTestId('cached-async-fallback')).toBeHidden()
    await expect(page.getByTestId('dynamic')).toContainText('Requested URL: /')
    await expect(page.getByTestId('dynamic-fallback')).toBeHidden()
    await waitForHydration(page)

    // Hydration must preserve the layout and cached component from the shell.
    await expect(page.getByTestId('layout')).toHaveText(layoutHtml!)
    await expect(page.getByTestId('cached-async')).toHaveText(cachedAsyncHtml!)

    // The client component is interactive after hydration.
    const counter = page.getByTestId('counter')
    const dynamicHtml = await page.getByTestId('dynamic').textContent()
    await counter.click()
    await expect(counter).toHaveText('Count is 1')

    // RSC navigation refreshes dynamic content while preserving static and client state.
    await using _noReload = await expectNoReload(page)
    await page.getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveURL(f.url('/about'))
    await expect(page.getByText('This is the about page.')).toBeVisible()
    await expect(page.getByTestId('dynamic')).toContainText(
      'Requested URL: /about',
    )
    await expect(page.getByTestId('dynamic')).not.toHaveText(dynamicHtml!)
    await expect(page.getByTestId('layout')).toHaveText(layoutHtml!)
    await expect(page.getByTestId('cached-async')).toHaveText(cachedAsyncHtml!)
    await expect(counter).toHaveText('Count is 1')
  })

  testNoJs('reuse static shell across document requests', async ({ page }) => {
    await page.goto(f.url('/about'))

    // Without JS, static work resolves but resumed dynamic content stays hidden.
    await expect(page.getByText('This is the about page.')).toBeVisible()
    await expect(page.getByTestId('layout')).toContainText('[rendered at ')
    await expect(page.getByTestId('cached-async')).toContainText(
      '[rendered at ',
    )
    await expect(page.getByTestId('cached-async-fallback')).toBeHidden()
    await expect(page.getByTestId('dynamic-fallback')).toBeVisible()
    await expect(page.getByTestId('dynamic')).toContainText(
      'Requested URL: /about',
    )
    await expect(page.getByTestId('dynamic')).toBeHidden()

    // A new document reuses static work but renders fresh dynamic content.
    const layoutTimestamp = await page.getByTestId('layout').textContent()
    const cachedAsyncTimestamp = await page
      .getByTestId('cached-async')
      .textContent()
    const dynamicTimestamp = await page.getByTestId('dynamic').textContent()

    await page.reload()
    await expect(page.getByTestId('dynamic')).not.toHaveText(dynamicTimestamp!)
    await expect(page.getByTestId('layout')).toHaveText(layoutTimestamp!)
    await expect(page.getByTestId('cached-async')).toHaveText(
      cachedAsyncTimestamp!,
    )
  })
}
