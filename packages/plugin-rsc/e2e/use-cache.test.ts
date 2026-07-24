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
    await page.goto(f.url())
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-fn')
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 0, cacheFnCount: 0)',
    )
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 1, cacheFnCount: 1)',
    )
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 2, cacheFnCount: 1)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 3, cacheFnCount: 2)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 4, cacheFnCount: 2)',
    )

    await locator.getByRole('textbox').fill('revalidate')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 5, cacheFnCount: 3)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 6, cacheFnCount: 4)',
    )
  })

  test('use cache component', async ({ page }) => {
    await page.goto(f.url())
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
    expect({ static2, dynamic2 }).toEqual({
      static2: expect.stringMatching(static1!),
      dynamic2: expect.not.stringMatching(dynamic1!),
    })
  })

  test('use cache closure', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-closure')
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 0, innerFnCount: 0)',
    )

    for (const [outer, inner, expected] of [
      ['x', 'y', '(actionCount: 1, innerFnCount: 1)'],
      ['x', 'y', '(actionCount: 2, innerFnCount: 1)'],
      ['xx', 'y', '(actionCount: 3, innerFnCount: 2)'],
      ['xx', 'y', '(actionCount: 4, innerFnCount: 2)'],
      ['xx', 'yy', '(actionCount: 5, innerFnCount: 3)'],
    ] as const) {
      await locator.getByPlaceholder('outer').fill(outer)
      await locator.getByPlaceholder('inner').fill(inner)
      await locator.getByRole('button').click()
      await expect(locator.locator('span')).toHaveText(expected)
    }
  })
}
