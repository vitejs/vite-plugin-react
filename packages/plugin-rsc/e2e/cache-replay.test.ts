import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

for (const mode of ['dev', 'build'] as const) {
  test.describe(mode, () => {
    const f = useFixture({
      root: 'examples/cache-replay',
      mode,
    })

    defineTests(f)
  })
}

function defineTests(f: Fixture) {
  const cacheFile = path.join(f.root, '.flight-cache')

  test.beforeEach(() => fs.rmSync(cacheFile, { force: true }))
  test.afterEach(() => fs.rmSync(cacheFile, { force: true }))

  test('replays a server reference without loading its module', async ({
    page,
  }) => {
    await page.goto(f.url('/cache'))
    await waitForHydration(page)
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    await f.restart()

    await page.goto(f.url('/read-cache'))
    await waitForHydration(page)
    await expect(
      page.getByRole('heading', { name: 'Cached content' }),
    ).toBeVisible()
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText('false')
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    await page.getByRole('button', { name: 'Invoke action' }).click()
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('true')
  })
}
