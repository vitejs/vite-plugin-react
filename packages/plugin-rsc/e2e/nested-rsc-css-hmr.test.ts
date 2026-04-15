import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoReload, waitForHydration } from './helper'

// Reproduces an HMR bug affecting server components whose modules live
// exclusively in the `rsc` environment and are rendered through a nested
// Flight stream (`renderToReadableStream` + `createFromReadableStream`),
// the pattern used by frameworks like TanStack Start's `createServerFn` +
// `renderServerComponent`.
//
// The fixture sets `cssLinkPrecedence: false` (matching TanStack Start's
// config) so plugin-rsc's emitted `<link>` has no `precedence` attribute,
// disabling React 19's resource-manager dedup/swap path that would
// otherwise paper over the underlying bugs.
//
// Expected failures on current `main` (both tied to plugin-rsc's dev-mode
// CSS pipeline):
//   1. `normalizeViteImportAnalysisUrl` gates the `?t=<HMRTimestamp>`
//      cache-buster on `environment.config.consumer === 'client'`, so
//      CSS hrefs emitted into the Flight stream from the `rsc` env
//      (consumer: 'server') never get cache-busted.
//   2. `hotUpdate` in plugin-rsc does not invalidate importers of a
//      changed CSS file in the `rsc` module graph, so the derived
//      `\0virtual:vite-rsc/css?type=rsc&id=…` virtual keeps emitting
//      the same stale href on re-render.
//
// The test edits the CSS file twice in the same dev session (change
// color, then revert). This matters because the reporter's proposed
// two-line patch fixes the **first** CSS edit after dev-server start
// but not subsequent edits in the same session — the `?t=` fix lands
// once, the virtual's `load` re-runs once (via some transitive Vite
// invalidation), and then on the second CSS change `mod.importers` no
// longer carries what's needed to re-invalidate the virtual. Asserting
// after the revert catches that the fix is incomplete.

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
