import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/use-cache', mode: 'dev' })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/use-cache', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  test('use cache function', async ({ page }) => {
    await page.goto(f.url('/cached-function'))
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-fn')
    const callCount = locator.getByTestId('call-count')
    const executionCount = locator.getByTestId('execution-count')
    const cacheKey = locator.getByRole('textbox', { name: 'Cache key' })
    const call = locator.getByRole('button', {
      name: 'Call cached function',
    })
    await expect(callCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')

    // The action runs on every submit, but the cached function runs once per argument.
    await call.click()
    await expect(callCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await call.click()
    await expect(callCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')
    await cacheKey.fill('beta')
    await call.click()
    await expect(callCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')
    await call.click()
    await expect(callCount).toHaveText('4')
    await expect(executionCount).toHaveText('2')

    // Clearing the cache makes the same key execute again.
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('_.rsc'),
      ),
      locator.getByRole('button', { name: 'Clear function cache' }).click(),
    ])
    await call.click()
    await expect(callCount).toHaveText('5')
    await expect(executionCount).toHaveText('3')
  })

  test('use cache component', async ({ page }) => {
    await page.goto(f.url('/cached-component'))
    await waitForHydration(page)
    const static1 = await page
      .getByTestId('test-use-cache-component-static')
      .textContent()
    const dynamic1 = await page
      .getByTestId('test-use-cache-component-dynamic')
      .textContent()
    await page.waitForTimeout(100)
    await page.reload()
    const static2 = await page
      .getByTestId('test-use-cache-component-static')
      .textContent()
    const dynamic2 = await page
      .getByTestId('test-use-cache-component-dynamic')
      .textContent()

    // The cached shell stays stable while temporary-reference children are refreshed.
    expect({ static2, dynamic2 }).toEqual({
      static2: expect.stringMatching(static1!),
      dynamic2: expect.not.stringMatching(dynamic1!),
    })
  })

  test('use cache captured values', async ({ page }) => {
    await page.goto(f.url('/captured-values'))
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-closure')
    const callCount = locator.getByTestId('call-count')
    const executionCount = locator.getByTestId('execution-count')
    const capturedValue = locator.getByRole('textbox', {
      name: 'Captured value',
    })
    const argument = locator.getByRole('textbox', {
      name: 'Function argument',
    })
    const call = locator.getByRole('button', {
      name: 'Call cached function',
    })
    await expect(callCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')

    // Both the captured outer value and call-time inner argument form the cache key.
    // (x, y)
    await call.click()
    await expect(callCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')

    // (x, y)
    await call.click()
    await expect(callCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')

    // (xx, y)
    await capturedValue.fill('xx')
    await call.click()
    await expect(callCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')

    // (xx, y)
    await call.click()
    await expect(callCount).toHaveText('4')
    await expect(executionCount).toHaveText('2')

    // (xx, yy)
    await argument.fill('yy')
    await call.click()
    await expect(callCount).toHaveText('5')
    await expect(executionCount).toHaveText('3')
  })
}
