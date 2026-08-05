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
    await page.getByRole('link', { name: 'Inline directive' }).click()
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
    await expect(ordinaryExports).toHaveText('cached metadata: cache')
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

  test('file directive argument admission', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-argument-admission'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-argument-admission')
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
}

async function submit(page: Page, form: Locator) {
  // `submissionCount` updates immediately on the client, while a cache hit leaves
  // the server-rendered execution count and result unchanged. Those assertions do
  // not prove that the server action and subsequent render have completed, so wait
  // for the action response before proceeding.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('_.rsc'),
    ),
    form.getByRole('button', { name: 'Call cached function' }).click(),
  ])
}
