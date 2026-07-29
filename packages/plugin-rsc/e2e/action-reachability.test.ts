import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'build',
  })

  test('dispatches a delayed action to its reachable route', async ({
    page,
  }) => {
    const manifest: Record<string, string[]> = JSON.parse(
      f.createEditor('dist/client/route-action-manifest.json').read(),
    )
    expect(manifest['/a']).toEqual([expect.stringMatching(/#actionA$/)])
    expect(manifest['/b']).toEqual([expect.stringMatching(/#actionB$/)])

    await page.goto(f.url('/a'))
    await waitForHydration(page)
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('_.rsc'),
    )
    await page.getByTestId('action-a').click()
    await page.getByRole('link', { name: '/b' }).click()
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    expect(response.headers()['x-action-route']).toBe('/a')
    expect(response.headers()['x-action-forwarded']).toBe('true')
    expect(await response.text()).toContain('ACTION_A_OK:/a')
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })
})
