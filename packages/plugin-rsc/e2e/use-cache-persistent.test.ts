import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/use-cache-persistent', mode: 'dev' })
  defineTests(f)
  defineDevTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/use-cache-persistent', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  const cacheDirectory = path.join(f.root, '.use-cache')
  test.beforeEach(() =>
    fs.rmSync(cacheDirectory, { recursive: true, force: true }),
  )
  test.afterEach(() =>
    fs.rmSync(cacheDirectory, { recursive: true, force: true }),
  )

  test('file directive scopes persistence across server restart', async ({
    page,
  }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    const example = page.getByTestId('file-directive-from-server')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    await reset(page)
    await expect(submissionCount).toHaveText('0')

    // The first invocation executes and persists its returned value.
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText(
      'server import + body-v1 + direct-v1 + transitive-v1 + alpha',
    )

    // The same key replays the persisted value without executing again.
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')

    await page.goto('about:blank')
    await f.restart()
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)
    await expect(submissionCount).toHaveText('0')
    await expect(executionCount).toHaveText('0')

    // Production reuses the same build-scoped entry after restart. Development
    // gets new transform timestamps so stopped-server edits cannot be stale.
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText(f.mode === 'dev' ? '1' : '0')
    await expect(result).toHaveText(
      'server import + body-v1 + direct-v1 + transitive-v1 + alpha',
    )
  })
}

function defineDevTests(f: Fixture) {
  const cacheDirectory = path.join(f.root, '.use-cache')
  test.beforeEach(() =>
    fs.rmSync(cacheDirectory, { recursive: true, force: true }),
  )
  test.afterEach(() =>
    fs.rmSync(cacheDirectory, { recursive: true, force: true }),
  )

  test('invalidates persistent entries after dependency updates', async ({
    page,
  }) => {
    using _errors = expectNoPageError(page)
    const action = f.createEditor(
      'src/features/file-directive-from-server/action-cached.ts',
    )
    const direct = f.createEditor(
      'src/features/file-directive-from-server/dep-direct.ts',
    )
    const transitive = f.createEditor(
      'src/features/file-directive-from-server/dep-transitive.ts',
    )

    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)
    const example = page.getByTestId('file-directive-from-server')
    const submissionCount = example.getByTestId('submission-count')
    const executionCount = example.getByTestId('execution-count')
    const result = example.getByTestId('result')
    await reset(page)
    await expect(submissionCount).toHaveText('0')

    // Warm one persistent entry and prove the second invocation is a cache hit.
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(result).toHaveText(
      'server import + body-v1 + direct-v1 + transitive-v1 + alpha',
    )
    await submit(page, example)
    await expect(submissionCount).toHaveText('2')
    await expect(executionCount).toHaveText('1')

    // Editing the cached function advances its module generation.
    action.edit((code) => code.replace('body-v1', 'body-v2'))
    await page.reload()
    await waitForHydration(page)
    await expectResultAfterUpdate(
      page,
      example,
      result,
      'server import + body-v2 + direct-v1 + transitive-v1 + alpha',
    )

    // Editing a direct dependency invalidates the importing cache module.
    direct.edit((code) => code.replace('direct-v1', 'direct-v2'))
    await page.reload()
    await waitForHydration(page)
    await expectResultAfterUpdate(
      page,
      example,
      result,
      'server import + body-v2 + direct-v2 + transitive-v1 + alpha',
    )

    // Reverse-importer traversal also reaches transitive dependencies.
    transitive.edit((code) => code.replace('transitive-v1', 'transitive-v2'))
    await page.reload()
    await waitForHydration(page)
    await expectResultAfterUpdate(
      page,
      example,
      result,
      'server import + body-v2 + direct-v2 + transitive-v2 + alpha',
    )

    // A development restart uses a fresh timestamp and executes the current source.
    await page.goto('about:blank')
    await f.restart()
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)
    await expect(submissionCount).toHaveText('0')
    await submit(page, example)
    await expect(submissionCount).toHaveText('1')
    await expect(executionCount).toHaveText('1')
    await expect(result).toHaveText(
      'server import + body-v2 + direct-v2 + transitive-v2 + alpha',
    )
  })
}

async function expectResultAfterUpdate(
  page: Page,
  form: Locator,
  result: Locator,
  expected: string,
) {
  await expect(async () => {
    await submit(page, form)
    await expect(result).toHaveText(expected)
  }).toPass({ timeout: 15_000 })
}

async function submit(page: Page, form: Locator) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('_.rsc'),
    ),
    form.getByRole('button', { name: 'Call cached function' }).click(),
  ])
  expect(response.ok()).toBe(true)
  await response.finished()
}

async function reset(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('_.rsc'),
    ),
    page.getByRole('button', { name: 'Reset cache' }).click(),
  ])
  expect(response.ok()).toBe(true)
  await response.finished()
}
