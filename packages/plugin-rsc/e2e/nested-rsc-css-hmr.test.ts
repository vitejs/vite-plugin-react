import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoReload, waitForHydration } from './helper'

// Covers CSS HMR for server-only components rendered via nested Flight stream
// (renderToReadableStream + createFromReadableStream — TanStack Start's
// createServerFn / renderServerComponent shape)
// Fixture uses cssLinkPrecedence: false so React 19 Float dedup/swap is off
// and raw HMR path is exercised
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
    // Revert is load-bearing: naive fix lands edit 1 but wedges Vite's
    // Promise.all racing React's <link> reconcile, blocking later rsc:update
    editor.reset()
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  // Rule removal (not just value change) checks the unmount path: old <link>
  // must drop, else the cascade keeps the stale rule
  test('round-trip with property removal does not leave stale link', async ({
    page,
  }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )

    // [data-rsc-css-href] scopes to RSC-emitted links, ignores Vite/React
    // injections
    // Two on load: outer Root collectCss + nested Flight collectCss
    // Bug shape is "grows per edit", so assert equal-to-initial, not equal-to-1
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

    // Edit 2: remove rule — falls back to :root color from index.css
    // (rgb(33, 53, 71)) — stale <link> would keep the blue
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

    // Edit 3: revert — back to original orange
    editor.reset()
    await expect(page.locator('.test-nested-rsc-inner')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(innerLinks).toHaveCount(initialLinkCount)
  })

  // card.module.css reached from RSC graph (card.tsx server component) and
  // client graph (client-tracker.tsx 'use client' side-effect import) — shape
  // TanStack Start hits when a route re-declares an RSC-owned stylesheet on
  // the client
  // Exercises the hasClientJsImporter branch of hotUpdate: fix filters the
  // CSS-typed module out of the HMR payload (so Vite's default client HMR
  // doesn't cloneNode+mutate the RSC <link>) while keeping the JS-typed
  // wrapper so updateStyle() keeps refreshing <style data-vite-dev-id>
  // .module.css on purpose — plain .css has no JS wrapper to keep
  // Tests guard the config shape; they don't repro the (timing-sensitive)
  // hydration race
  test('css module reached by both RSC and client graphs hot-updates across edits', async ({
    page,
  }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'color',
      'rgb(128, 0, 128)',
    )

    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/shared-graph/card.module.css')

    editor.edit((s) => s.replaceAll('rgb(128, 0, 128)', 'rgb(255, 0, 0)'))
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'color',
      'rgb(255, 0, 0)',
    )

    editor.edit((s) => s.replaceAll('rgb(255, 0, 0)', 'rgb(0, 0, 255)'))
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'color',
      'rgb(0, 0, 255)',
    )

    editor.reset()
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'color',
      'rgb(128, 0, 128)',
    )
  })

  // Covers the "keep JS wrapper in the HMR payload" half: without wrapper
  // self-accept, removed rules stay live on <style data-vite-dev-id>
  test('removing a rule from the shared css module falls through the cascade', async ({
    page,
  }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'text-transform',
      'uppercase',
    )

    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/shared-graph/card.module.css')
    editor.edit((s) =>
      s.replaceAll(
        'text-transform: uppercase;',
        '/* text-transform: removed */',
      ),
    )
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'text-transform',
      'none',
    )
    editor.reset()
    await expect(page.locator('[data-testid="shared-graph-card"]')).toHaveCSS(
      'text-transform',
      'uppercase',
    )
  })
})
