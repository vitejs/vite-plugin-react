import { expect, test, type Locator, type Page } from '@playwright/test'
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
    const argument = example.getByRole('textbox', { name: 'argument' })
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: captured:same:1',
    )
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: captured:same:1',
    )
    await argument.fill('different')
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 3; result: captured:different:2',
    )
  })

  test('inline directive progressive enhancement', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(f.url('/inline-directive'))

    const example = page.getByTestId('inline-directive')
    await example.getByRole('textbox', { name: 'argument' }).fill('progressive')
    await example.getByRole('button', { name: 'call' }).click()
    const result = await example.locator('span').textContent()
    expect(result).toMatch(/^requests: 0; result: captured:progressive:\d+$/)

    await example.getByRole('textbox', { name: 'argument' }).fill('progressive')
    await example.getByRole('button', { name: 'call' }).click()
    await expect(example.locator('span')).toHaveText(result!)
    await context.close()
  })

  test('file directive from server', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-server')
    await expect(example.locator('span')).toHaveText(
      'requests: 0; result: none',
    )
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: server:same:1',
    )
    await submit(page, example)
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
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 1; result: client:same:1',
    )
    await submit(page, example)
    await expect(example.locator('span')).toHaveText(
      'requests: 2; result: client:same:1',
    )
  })
}

async function submit(page: Page, form: Locator) {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('_.rsc'),
    ),
    form.getByRole('button', { name: 'call' }).click(),
  ])
}
