import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'

// Regression test for the client `hotUpdate` guard: a genuine client-rendered
// component that is also present in the `rsc` module graph (because its file
// co-locates server-graph code) must keep Fast Refresh. Before the fix the
// guard returned `[]` for such files and the edit was silently dropped on the
// client. See `examples/co-located-client-hmr` for how the import graph is set
// up (browser entry -> app -> page, with no `"use client"` boundary).
test.describe('co-located-client-hmr', () => {
  const f = useFixture({ root: 'examples/co-located-client-hmr', mode: 'dev' })

  test('route component co-located with rsc-graph code hot-updates', async ({
    page,
  }) => {
    await page.goto(f.url())

    const marker = page.getByTestId('marker')
    const count = page.getByTestId('count')
    await expect(marker).toHaveText('marker-baseline')

    // seed client state to prove the edit is a Fast Refresh, not a reload
    await count.click()
    await count.click()
    await expect(count).toHaveText('count: 2')

    const editor = f.createEditor('src/routes/page.tsx')
    editor.edit((s) => s.replace('marker-baseline', 'marker-edited'))
    await expect(marker).toHaveText('marker-edited')
    await expect(count).toHaveText('count: 2')

    editor.reset()
    await expect(marker).toHaveText('marker-baseline')
    await expect(count).toHaveText('count: 2')
  })
})
