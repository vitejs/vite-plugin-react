import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoReload, waitForHydration } from './helper'

// Verifies CSS HMR for server components whose modules live exclusively
// in the `rsc` environment and are rendered through a nested Flight
// stream (`renderToReadableStream` + `createFromReadableStream`) — the
// pattern used by frameworks like TanStack Start's `createServerFn` +
// `renderServerComponent`.
//
// The fixture sets `cssLinkPrecedence: false` (matching TanStack Start's
// config) so plugin-rsc's emitted `<link>` has no `precedence` attribute
// and React 19's resource-manager dedup/swap path is not in play. This
// is the configuration where the underlying CSS-HMR issues surface;
// under the default (`true`) path Vite's client CSS HMR + Float
// dedup papers over them.
//
// The test performs a round-trip edit (change color, then revert) in the
// same dev session. The revert is load-bearing: a naive fix can make the
// first edit land while leaving every subsequent edit silently stuck on
// the previous value (Vite's client CSS HMR hangs its `Promise.all` when
// it races React's reconciliation of the RSC-owned `<link>`, which
// blocks every later WebSocket message including the next `rsc:update`).
// Asserting after the revert catches that regression class.

test.describe('nested-rsc-css-hmr', () => {
  const f = useFixture({
    root: 'examples/nested-rsc-css-hmr',
    mode: 'dev',
  })

  test('css hmr through nested RSC Flight stream', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )

    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/nested-rsc/inner.css')
    editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(0, 165, 255)',
    )
    editor.reset()
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  // Verifies that *removing* a CSS rule (not just changing its value) takes
  // effect across HMR edits. Because plugin-rsc's HMR fix appends a
  // `?t=<ts>` cache-buster to the emitted `<link href>` on every RSC
  // re-render, each edit produces a `<link>` with a new href. This test
  // asserts two things that a value-only edit can't catch:
  //
  // 1. The previous `<link>` is actually unmounted by React on each edit
  //    (no DOM accumulation). If old `<link>` nodes lingered — as happens
  //    when React 19 Float manages them by precedence and dedupes by href
  //    rather than by intent — a deleted property would still cascade from
  //    the stale stylesheet and the change would be silently lost.
  // 2. Commenting out the `color` rule actually falls back to the UA
  //    default (`rgb(0, 0, 0)`), which exercises the unmount path end to
  //    end (browser drops the old sheet, no rule applies anymore).
  //
  // The link-count assertion uses `[data-rsc-css-href]` so it only counts
  // RSC-emitted stylesheets for `inner.css` and ignores other links Vite
  // or React may inject (HMR client style tags, preload hints, etc).
  //
  // Note: in this fixture two `<link>`s for `inner.css` exist on initial
  // load — one from the outer Root tree's `collectCss`, one from the
  // nested Flight stream's own `collectCss`. The accumulation bug we want
  // to catch is "count grows per edit" (yak-style), so we capture the
  // initial count and assert it stays equal across edits — not that it
  // equals 1.
  test('round-trip with property removal does not leave stale link', async ({
    page,
  }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )

    const innerLinks = page.locator(
      'link[rel="stylesheet"][data-rsc-css-href*="inner.css"]',
    )
    const initialLinkCount = await innerLinks.count()
    expect(initialLinkCount).toBeGreaterThan(0)

    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/nested-rsc/inner.css')

    // Edit 1: change value
    editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(0, 165, 255)',
    )
    await expect(innerLinks).toHaveCount(initialLinkCount)

    // Edit 2: remove the rule — color must fall back to the inherited
    // value (`:root { color: #213547 }` from `index.css`, light scheme =
    // rgb(33, 53, 71)). If any old `<link>` for `inner.css` were still
    // attached, the cascade would keep the blue.
    editor.edit((s) =>
      s.replaceAll(
        'color: rgb(0, 165, 255);',
        '/* color: rgb(0, 165, 255); */',
      ),
    )
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(33, 53, 71)',
    )
    await expect(innerLinks).toHaveCount(initialLinkCount)

    // Edit 3: revert — back to original orange.
    editor.reset()
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(innerLinks).toHaveCount(initialLinkCount)
  })
})
