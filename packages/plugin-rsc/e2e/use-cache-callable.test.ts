import { expect, test, type Locator, type Page } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoPageError, testNoJs, waitForHydration } from './helper'

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
    await page
      .getByRole('link', { name: 'Inline directive', exact: true })
      .click()
    await expect(page).toHaveURL(f.url('/inline-directive'))

    const example = page.getByTestId('inline-directive')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', { name: 'Cache key' })
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // The callable is submitted every time, but the cached implementation runs once per argument.
    // alpha (cache miss)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')

    // alpha (cache hit)
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')

    // beta (cache miss)
    await argument.fill('beta')
    await submit(page, example)
    await expect(submissionCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('captured + beta')
  })

  test('inline directive cache hit after hydrated reload', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/inline-directive'))
    await waitForHydration(page)

    const example = page.getByTestId('inline-directive')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(executionCount).toHaveText('0')

    // Reloading and hydrating a fresh SSR form preserves the cache hit for the same argument.
    // alpha (cache miss)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')

    // alpha after reload (cache hit)
    await page.reload()
    await waitForHydration(page)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')
  })

  testNoJs('inline directive progressive enhancement', async ({ page }) => {
    await page.goto(f.url('/inline-directive'))

    const example = page.getByTestId('inline-directive')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', { name: 'Cache key' })
    const call = example.getByRole('button', { name: 'Call cached function' })

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // Native form submissions call the same cached function without hydration.
    // alpha (cache miss)
    await argument.fill('alpha')
    await call.click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')

    // alpha (cache hit)
    await argument.fill('alpha')
    await call.click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('captured + alpha')

    // beta (cache miss)
    await argument.fill('beta')
    await call.click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('captured + beta')
  })

  test('file directive from server', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-server')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const ordinaryExports = example.getByTestId('ordinary-exports')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', { name: 'Cache key' })
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(ordinaryExports).toHaveText('object: array')
    await expect(result).toHaveText('not called')

    // The wrapped export is passed from a Server Component to a Client Component.
    // alpha (cache miss)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('server import + alpha')

    // alpha (cache hit)
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('server import + alpha')

    // beta (cache miss)
    await argument.fill('beta')
    await submit(page, example)
    await expect(submissionCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('server import + beta')
  })

  test('file directive cache hit after hydrated reload', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-server')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(executionCount).toHaveText('0')

    // Reloading and hydrating a fresh SSR form preserves the cache hit for the same argument.
    // alpha (cache miss)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('server import + alpha')

    // alpha after reload (cache hit)
    await page.reload()
    await waitForHydration(page)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('server import + alpha')
  })

  testNoJs(
    'file directive from server progressive enhancement',
    async ({ page }) => {
      await page.goto(f.url('/file-directive-from-server'))

      const example = page.getByTestId('file-directive-from-server')
      const submissionCount = example.getByTestId('submission-count')
      const executionCount = example.getByTestId('execution-count')
      const result = example.getByTestId('result')
      const argument = example.getByRole('textbox', { name: 'Cache key' })
      const call = example.getByRole('button', { name: 'Call cached function' })

      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('0')
      await expect(result).toHaveText('not called')

      // The wrapped export remains callable through native form submissions.
      // alpha (cache miss)
      await argument.fill('alpha')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('1')
      await expect(result).toHaveText('server import + alpha')

      // alpha (cache hit)
      await argument.fill('alpha')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('1')
      await expect(result).toHaveText('server import + alpha')

      // beta (cache miss)
      await argument.fill('beta')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('2')
      await expect(result).toHaveText('server import + beta')
    },
  )

  test('file directive from client', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-client'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-client')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', { name: 'Cache key' })
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // The generated client proxy calls the wrapped export.
    // alpha (cache miss)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('client import + alpha')

    // alpha (cache hit)
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('client import + alpha')

    // beta (cache miss)
    await argument.fill('beta')
    await submit(page, example)
    await expect(submissionCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('client import + beta')
  })

  testNoJs(
    'file directive from client progressive enhancement',
    async ({ page }) => {
      await page.goto(f.url('/file-directive-from-client'))

      const example = page.getByTestId('file-directive-from-client')
      const submissionCount = example.getByTestId('submission-count')
      const executionCount = example.getByTestId('execution-count')
      const result = example.getByTestId('result')
      const argument = example.getByRole('textbox', { name: 'Cache key' })
      const call = example.getByRole('button', { name: 'Call cached function' })

      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('0')
      await expect(result).toHaveText('not called')

      // The generated client proxy remains callable through native form submissions.
      // alpha (cache miss)
      await argument.fill('alpha')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('1')
      await expect(result).toHaveText('client import + alpha')

      // alpha (cache hit)
      await argument.fill('alpha')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('1')
      await expect(result).toHaveText('client import + alpha')

      // beta (cache miss)
      await argument.fill('beta')
      await call.click()
      await expect(submissionCount).toHaveText('0')
      await expect(executionCount).toHaveText('2')
      await expect(result).toHaveText('client import + beta')
    },
  )

  test('file directive extra arguments', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-extra-arguments'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-extra-arguments')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', { name: 'Ignored argument' })
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // React supplies FormData to the zero-parameter function, but it does not
    // participate in the cache key or invocation.
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('arguments: 0')

    await argument.fill('beta')
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('arguments: 0')
  })

  test('inline directive extra arguments', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/inline-directive-extra-arguments'))
    await waitForHydration(page)

    const example = page.getByTestId('inline-directive-extra-arguments')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    const argument = example.getByRole('textbox', {
      name: 'Undeclared argument',
    })
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // Inline transform metadata does not yet expose the source parameters, so
    // React's FormData still participates in the cache key and invocation.
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('arguments: 1')

    await argument.fill('beta')
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('arguments: 1')
  })

  test('protected captures', async ({ page }) => {
    // verify captured value is encoded and thus doesn't appear in raw response
    const rscResponse = await page.request.get(
      f.url('/protected-captures_.rsc'),
    )
    expect(rscResponse.ok()).toBe(true)
    expect(await rscResponse.text()).not.toContain('capture-secret')

    using _errors = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('link', { name: 'Protected captures' }).click()
    await expect(page).toHaveURL(f.url('/protected-captures'))

    const example = page.getByTestId('protected-captures')
    const submissionCount = example.getByTestId('submission-count')
    const capture = page.getByTestId('capture')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(submissionCount).toHaveText('0')
    await expect(capture).toHaveText('first')
    await expect(executionCount).toHaveText('0')
    await expect(result).toHaveText('not called')

    // submit with "first" capture and "alpha" argument
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('first + alpha')

    // A fresh render and ciphertext for the same logical capture still hits.
    await page.reload()
    await waitForHydration(page)
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText('first + alpha')

    // The same invocation with a different decoded capture is a cache miss.
    await page.getByRole('button', { name: 'Second capture' }).click()
    await expect(capture).toHaveText('second')
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('second + alpha')

    await page.getByRole('button', { name: 'First capture' }).click()
    await expect(capture).toHaveText('first')
    await submit(page, example)
    await expect(submissionCount).toHaveText('3')
    await expect(executionCount).toHaveText('2')
    await expect(result).toHaveText('first + alpha')
  })
}

async function submit(page: Page, form: Locator) {
  // `submissionCount` updates immediately on the client, while a cache hit leaves
  // the server-rendered execution count and result unchanged. Those assertions do
  // not prove that the server action and subsequent render have completed, so wait
  // for the action response before proceeding.
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('_.rsc'),
    ),
    form.getByRole('button', { name: 'Call cached function' }).click(),
  ])
  expect(response.ok()).toBe(true)
}
