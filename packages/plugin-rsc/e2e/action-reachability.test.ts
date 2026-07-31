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

  for (const name of ['Unbound', 'Bound']) {
    test(`${name.toLowerCase()} progressive action is limited to its route`, async ({
      page,
    }) => {
      await page.goto(f.url('/a?__nojs'))
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
      expect(validResponse.request().headers()['content-type']).toContain(
        'multipart/form-data',
      )
      expect(validResponse.request().headers()['x-rsc-action']).toBeUndefined()
      await expect(page).toHaveURL(f.url('/a?__nojs'))

      await page.goto(f.url('/a?__nojs'))
      const replayedForm = page.getByRole('form', {
        name: `${name} progressive action`,
        exact: true,
      })
      await replayedForm.evaluate((element) => {
        element.setAttribute('action', '/b?__nojs')
      })
      const rejectedResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST',
      )
      await replayedForm.getByRole('button').click()
      const rejectedResponse = await rejectedResponsePromise
      expect(rejectedResponse.status()).toBe(404)
      expect(rejectedResponse.request().headers()['content-type']).toContain(
        'multipart/form-data',
      )
      expect(
        rejectedResponse.request().headers()['x-rsc-action'],
      ).toBeUndefined()
      await expect(
        page.getByText('Server action is not reachable'),
      ).toBeVisible()
      await expect(page).toHaveURL(f.url('/b?__nojs'))
    })
  }

  test('validates the bound action ID React decodes', async ({ page }) => {
    await page.goto(f.url('/a?__nojs'))
    const form = page.getByRole('form', {
      name: 'Bound progressive action',
      exact: true,
    })
    await form.evaluate((element) => {
      if (!(element instanceof HTMLFormElement)) {
        throw new Error('Expected a form element')
      }
      const descriptor = [...element.elements].find((field) =>
        field.getAttribute('name')?.endsWith(':0'),
      )
      if (!(descriptor instanceof HTMLInputElement)) {
        throw new Error('Missing bound action descriptor')
      }
      const metadata = JSON.parse(descriptor.value)
      descriptor.value = `{"id":${JSON.stringify(metadata.id)},"id":"missing#action","bound":${JSON.stringify(metadata.bound)}}`
    })

    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST',
    )
    await form.getByRole('button').click()
    expect((await responsePromise).status()).toBe(404)
    await expect(page.getByText('Server action is not reachable')).toBeVisible()
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
