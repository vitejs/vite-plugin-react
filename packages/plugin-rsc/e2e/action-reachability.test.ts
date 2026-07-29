import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'build',
  })

  test('dispatches a retained action to its reachable route', async ({
    page,
  }) => {
    const manifest: Record<string, string[]> = JSON.parse(
      f.createEditor('dist/client/route-action-manifest.json').read(),
    )
    expect(manifest['/a']).toEqual([expect.stringMatching(/#actionA$/)])
    expect(manifest['/b']).toEqual([expect.stringMatching(/#actionB$/)])

    // /a -> save action A -> navigate to /b -> run action A through /a
    await page.goto(f.url('/a'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Save action A' }).click()
    await page.getByRole('link', { name: '/b' }).click()
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Run saved action' }),
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Run saved action' }).click()
    await expect(page.getByText('Result: ACTION_A_OK:/a')).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })
})
