import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/cache-replay',
    mode: 'dev',
  })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/cache-replay',
    mode: 'build',
  })
  defineTests(f)
})

function defineTests(f: Fixture) {
  const cacheFile = path.join(f.root, '.flight-cache')

  test.beforeEach(() => fs.rmSync(cacheFile, { force: true }))
  test.afterEach(() => fs.rmSync(cacheFile, { force: true }))

  test('replays a server reference without loading its module', async ({
    page,
  }) => {
    await page.goto(f.url('/'))
    await expect(page.getByTestId('cache-exists')).toHaveText('false')

    // Serialize content after importing its action.
    await page.goto(f.url('/cache'))
    await waitForHydration(page)
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    await page.goto('about:blank')
    await f.restart()

    // Default replay imports the referenced action.
    await page.goto(f.url('/read-cache'))
    await waitForHydration(page)
    await expect(page.getByTestId('cached-content')).toBeVisible()
    await page.goto(f.url('/'))
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    await page.goto('about:blank')
    await f.restart()

    // Preserved replay leaves the referenced action unloaded.
    await page.goto(f.url('/read-cache-preserve'))
    await waitForHydration(page)
    await expect(page.getByTestId('cached-content')).toBeVisible()
    await page.goto(f.url('/'))
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText('false')
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    // Invoking the preserved reference imports and runs the action.
    await page.goto(f.url('/read-cache-preserve'))
    await waitForHydration(page)
    await page.getByTestId('invoke-action').click()
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('true')
  })
}
