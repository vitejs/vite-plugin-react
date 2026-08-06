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

  test('file directive persists across server restart', async ({ page }) => {
    using _errors = expectNoPageError(page)
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)

    let example = page.getByTestId('file-directive-from-server')
    await page.getByRole('button', { name: 'Reset' }).click()
    await submit(page, example)
    await expect(example.getByTestId('execution-count')).toHaveText('1')
    await expect(example.getByTestId('result')).toHaveText(
      'server import + body-v1 + direct-v1 + transitive-v1 + alpha',
    )

    await submit(page, example)
    await expect(example.getByTestId('execution-count')).toHaveText('1')

    await page.goto('about:blank')
    await f.restart()
    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)
    example = page.getByTestId('file-directive-from-server')
    await expect(example.getByTestId('execution-count')).toHaveText('0')

    await submit(page, example)
    await expect(example.getByTestId('submission-count')).toHaveText('1')
    await expect(example.getByTestId('execution-count')).toHaveText('0')
  })

  test('encrypted captures use their decoded values as persistent keys', async ({
    page,
  }) => {
    const rscResponse = await page.request.get(
      f.url('/protected-captures_.rsc'),
    )
    expect(rscResponse.ok()).toBe(true)
    expect(await rscResponse.text()).not.toContain('capture-secret')

    using _errors = expectNoPageError(page)
    await page.goto(f.url('/protected-captures'))
    await waitForHydration(page)
    const example = page.getByTestId('protected-captures')
    const executionCount = example.getByTestId('execution-count')
    await page.getByRole('button', { name: 'Reset' }).click()

    await submit(page, example)
    await expect(executionCount).toHaveText('1')
    await expect(example.getByTestId('result')).toHaveText('first + alpha')

    await page.reload()
    await waitForHydration(page)
    await submit(page, example)
    await expect(executionCount).toHaveText('1')

    await page.getByRole('button', { name: 'Second capture' }).click()
    await submit(page, example)
    await expect(executionCount).toHaveText('2')
    await expect(example.getByTestId('result')).toHaveText('second + alpha')
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
      'src/features/file-directive-from-server/action.ts',
    )
    const direct = f.createEditor(
      'src/features/file-directive-from-server/direct.ts',
    )
    const transitive = f.createEditor(
      'src/features/file-directive-from-server/transitive.ts',
    )

    await page.goto(f.url('/file-directive-from-server'))
    await waitForHydration(page)
    const example = page.getByTestId('file-directive-from-server')
    const result = example.getByTestId('result')
    await page.getByRole('button', { name: 'Reset' }).click()
    await submit(page, example)
    await expect(result).toHaveText(
      'server import + body-v1 + direct-v1 + transitive-v1 + alpha',
    )
    await submit(page, example)
    await expect(example.getByTestId('execution-count')).toHaveText('1')

    try {
      action.edit((code) => code.replace('body-v1', 'body-v2'))
      await page.reload()
      await waitForHydration(page)
      await expectResultAfterUpdate(
        page,
        example,
        result,
        'server import + body-v2 + direct-v1 + transitive-v1 + alpha',
      )

      direct.edit((code) => code.replace('direct-v1', 'direct-v2'))
      await page.reload()
      await waitForHydration(page)
      await expectResultAfterUpdate(
        page,
        example,
        result,
        'server import + body-v2 + direct-v2 + transitive-v1 + alpha',
      )

      transitive.edit((code) => code.replace('transitive-v1', 'transitive-v2'))
      await page.reload()
      await waitForHydration(page)
      await expectResultAfterUpdate(
        page,
        example,
        result,
        'server import + body-v2 + direct-v2 + transitive-v2 + alpha',
      )
    } finally {
      action.reset()
      direct.reset()
      transitive.reset()
    }
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
}
