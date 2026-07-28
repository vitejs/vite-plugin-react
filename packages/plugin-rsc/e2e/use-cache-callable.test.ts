import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/use-cache-callable', mode: 'dev' })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/use-cache-callable', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  test('inline directive', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('link', { name: 'Inline directive' }).click()
    await expect(page).toHaveURL(f.url('/inline-directive'))

    const example = page.getByTestId('inline-directive')
    await expect(example.locator('span')).toHaveText(
      'requests: 0; result: none',
    )
    await example.getByRole('button', { name: 'same' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: captured:same:1',
    )
    await example.getByRole('button', { name: 'same' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: captured:same:1',
    )
    await example.getByRole('button', { name: 'different' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 3; result: captured:different:2',
    )
  })

  test('file directive from server', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-server')
    await expect(example.locator('span')).toHaveText(
      'requests: 0; result: none',
    )
    await example.getByRole('button', { name: 'call' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: server:same:1',
    )
    await example.getByRole('button', { name: 'call' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: server:same:1',
    )
  })

  test('file directive from client', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-client'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-client')
    await expect(example.locator('span')).toHaveText(
      'requests: 0; result: none',
    )
    await example.getByRole('button', { name: 'call' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: client:same:1',
    )
    await example.getByRole('button', { name: 'call' }).click()
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: client:same:1',
    )
  })
}
