import { expect, test, type Page } from '@playwright/test'
import { useFixture } from './fixture'
import { testNoJs, waitForHydration } from './helper'

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

  test('rejects a retained action passed as an argument', async ({ page }) => {
    // Action B is reachable from /b, but the retained action A in its
    // arguments is not.
    await page.goto(f.url('/a'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Save action A' }).click()
    await page.getByRole('link', { name: '/b' }).click()
    await expect(
      page.getByRole('button', { name: 'Run action B with saved action' }),
    ).toBeEnabled()

    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST',
    )
    await page
      .getByRole('button', { name: 'Run action B with saved action' })
      .click()
    const response = await responsePromise
    expect(response.status()).toBe(404)
    expect(await response.text()).toContain('Server action is not reachable')
    await expect(page.getByText('Result: none')).toBeVisible()
  })

  test('accepts a reachable action passed as an argument', async ({ page }) => {
    await page.goto(f.url('/b'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Save action B' }).click()
    // Navigate away and back to re-render with the saved action.
    await page.getByRole('link', { name: '/a' }).click()
    await page.getByRole('link', { name: '/b' }).click()
    await page
      .getByRole('button', { name: 'Run action B with saved action' })
      .click()
    await expect(
      page.getByText('Result: ACTION_B_WITH:ACTION_B_OK:MIDDLEWARE_B'),
    ).toBeVisible()
  })

  testNoJs(
    'unbound progressive action is limited to its route',
    async ({ page }) => {
      await testProgressiveAction(page, 'Unbound')
    },
  )

  testNoJs(
    'bound progressive action is limited to its route',
    async ({ page }) => {
      await testProgressiveAction(page, 'Bound')
    },
  )

  testNoJs(
    'server function bound to a progressive action is limited to its route',
    async ({ page }) => {
      await testProgressiveAction(page, 'Shared')
    },
  )

  /**
   * Submits one of the progressive forms on `/c` without JavaScript, which must
   * run on `/c`, then retargets the same form to `/b` to simulate a stale or
   * manipulated submission, which must be rejected with 404.
   *
   * `decodeAction` rejects all three on `/b`, at a different reference:
   * - Unbound: the action from the `$ACTION_ID_*` field.
   * - Bound: the action from the `$ACTION_REF_*` metadata.
   * - Shared: the action bound to it, since `/b` also reaches the shared action.
   */
  async function testProgressiveAction(
    page: Page,
    name: 'Unbound' | 'Bound' | 'Shared',
  ) {
    // Without JavaScript, React submits the action as a native full-page (MPA)
    // multipart form request to the route that rendered it.
    await page.goto(f.url('/c'))
    const form = page.getByRole('form', {
      name: `${name} progressive action`,
      exact: true,
    })

    const validResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST',
    )
    await form.getByRole('button').click()
    const validResponse = await validResponsePromise
    expect(validResponse.status()).toBe(200)
    await expect(page).toHaveURL(f.url('/c'))

    // Replay the same React-generated fields to a route that cannot reach them.
    await page.goto(f.url('/c'))
    const replayedForm = page.getByRole('form', {
      name: `${name} progressive action`,
      exact: true,
    })
    await replayedForm.evaluate((element) => {
      element.setAttribute('action', '/b')
    })
    const rejectedResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST',
    )
    await replayedForm.getByRole('button').click()
    const rejectedResponse = await rejectedResponsePromise
    expect(rejectedResponse.status()).toBe(404)
    await expect(page.getByText('Server action is not reachable')).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
  }
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
