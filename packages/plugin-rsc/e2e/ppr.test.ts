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

  test('round trip persisted PPR manifest', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url('/?__ppr'))
    await expect(page.getByTestId('layout')).toContainText('[rendered at ')
    await expect(page.getByTestId('dynamic')).toContainText('Requested URL: /')
    await waitForHydration(page)
  })
})

test.describe('dev shell phases', () => {
  const f = useFixture({ root: 'examples/ppr', mode: 'dev' })
  defineShellPhaseTest(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/ppr', mode: 'build' })
  definePprTest(f)
})

function defineShellPhaseTest(f: Fixture) {
  test('first pass expands the strict second-pass shell', async ({
    request,
  }) => {
    // This describe owns a fresh server and cache. Without the first pass, the
    // strict second pass postpones the cold CachedLayout miss instead of
    // filling it, so the captured prelude cannot contain the document shell.
    const noPrepassPrelude = await request.get(
      f.url('/?__ppr_no_prepass&__ppr_prelude'),
    )
    expect(noPrepassPrelude.ok()).toBe(true)
    expect(await noPrepassPrelude.text()).not.toContain('data-testid="layout"')

    // The postponed miss left the cache cold. The normal first pass now fills
    // CachedLayout and its follow-on CachedAsyncContent entry, allowing the
    // clean second pass to capture both as static prelude content.
    const twoPass = await request.get(f.url('/?__ppr_prelude'))
    expect(twoPass.ok()).toBe(true)
    const twoPassHtml = await twoPass.text()
    expect(twoPassHtml).toContain('data-testid="layout"')
    expect(twoPassHtml).toContain('data-testid="cached-async"')
  })
}

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
