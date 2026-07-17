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
  const inlineCacheFile = path.join(f.root, '.flight-inline-cache')

  test.beforeEach(() => {
    fs.rmSync(cacheFile, { force: true })
    fs.rmSync(inlineCacheFile, { force: true })
  })
  test.afterEach(() => {
    fs.rmSync(cacheFile, { force: true })
    fs.rmSync(inlineCacheFile, { force: true })
  })

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

    // Avoid a dev client reload racing navigation after restart.
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

    // Avoid a dev client reload racing navigation after restart.
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

  test('replays an inline server reference without rerunning its component', async ({
    page,
  }) => {
    // Restart so the module graphs are cold: rendering the route must
    // transform the inline-action module in the rsc environment first and
    // then in the ssr graph (for its metadata), the order that used to drop
    // the action's registration.
    await f.restart()

    await page.goto(f.url('/cache-inline'))
    await waitForHydration(page)
    // The SSR entry renders the route module's metadata as the document title.
    await expect(page).toHaveTitle('Cached inline content')
    await expect(page.getByTestId('inline-cache-exists')).toHaveText('true')
    await expect(page.getByTestId('inline-action-imported')).toHaveText(
      String(f.mode === 'dev'),
    )
    await expect(page.getByTestId('inline-action-invoked')).toHaveText('false')

    // Invoking the inline action right after rendering it must work even
    // though the module also flows through the SSR graph for its metadata.
    await page.getByTestId('invoke-inline-action').click()
    await expect(page.getByTestId('inline-action-imported')).toHaveText('true')
    await expect(page.getByTestId('inline-action-invoked')).toHaveText('true')

    await page.goto('about:blank')
    await f.restart()

    await page.goto(f.url('/read-inline-cache-preserve'))
    await waitForHydration(page)
    await expect(page.getByTestId('cached-inline-content')).toBeVisible()
    await expect(page.getByTestId('inline-action-imported')).toHaveText('false')
    await page.getByTestId('invoke-inline-action').click()
    await expect(page.getByTestId('inline-action-imported')).toHaveText('true')
    await expect(page.getByTestId('inline-action-invoked')).toHaveText('true')

    // A page added to the shared map flows through the pipeline with no build
    // configuration changes: prerendered payload, preserved replay, and its
    // inline action reaching the manifest.
    await page.goto(f.url('/cache-inline-second'))
    await waitForHydration(page)
    await expect(page.getByTestId('second-inline-content')).toBeVisible()
    await expect(page.getByTestId('second-inline-action-imported')).toHaveText(
      String(f.mode === 'dev'),
    )
    await expect(page.getByTestId('second-inline-action-invoked')).toHaveText(
      'false',
    )
    await page.getByTestId('invoke-second-inline-action').click()
    await expect(page.getByTestId('second-inline-action-imported')).toHaveText(
      'true',
    )
    await expect(page.getByTestId('second-inline-action-invoked')).toHaveText(
      'true',
    )
  })
}
