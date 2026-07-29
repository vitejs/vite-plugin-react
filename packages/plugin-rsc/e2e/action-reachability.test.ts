import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'build',
  })

  test('executes a retained action through /a', async ({ page }) => {
    // The production manifest redispatches the /b request through /a.
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
    await expect(
      page.getByText('Result: ACTION_A_OK:MIDDLEWARE_A'),
    ).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })
})

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'dev',
  })

  test('executes a retained action through /b', async ({ page }) => {
    // Development has no route manifest, so the same request stays on /b.
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
    await expect(
      page.getByText('Result: ACTION_A_OK:MIDDLEWARE_B'),
    ).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })
})
