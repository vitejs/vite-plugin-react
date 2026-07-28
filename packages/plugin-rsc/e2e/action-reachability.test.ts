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
    expect(manifest['/']).toEqual([
      expect.stringMatching(/#objectWrappedAction$/),
    ])
    expect(manifest['/other']).toEqual([expect.stringMatching(/#otherAction$/)])

    await page.goto(f.url())
    await waitForHydration(page)
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('_.rsc'),
    )
    await page.getByTestId('home-action').click()
    await page.getByRole('link', { name: 'Other route' }).click()
    await expect(
      page.getByRole('heading', { name: 'Other route' }),
    ).toBeVisible()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    expect(response.headers()['x-action-route']).toBe('/')
    expect(response.headers()['x-action-forwarded']).toBe('true')
    expect(await response.text()).toContain('HOME_ACTION_OK:/')
    await expect(
      page.getByRole('heading', { name: 'Other route' }),
    ).toBeVisible()
  })
})
