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
})
