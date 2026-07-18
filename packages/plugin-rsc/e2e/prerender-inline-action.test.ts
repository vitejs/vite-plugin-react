import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/prerender-inline-action',
    mode: 'dev',
  })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/prerender-inline-action',
    mode: 'build',
  })
  defineTests(f)
})

function defineTests(f: Fixture) {
  const cacheFile = path.join(f.root, '.flight-cache')

  test.beforeEach(() => fs.rmSync(cacheFile, { force: true }))
  test.afterEach(() => fs.rmSync(cacheFile, { force: true }))

  test('invokes an inline action from prerendered Flight', async ({ page }) => {
    await page.goto(f.url('/cache'))
    await waitForHydration(page)
    await expect(page).toHaveTitle('Prerendered inline action')
    await expect(page.getByTestId('inline-page')).toBeVisible()
    await expect(page.getByTestId('cache-exists')).toHaveText('true')
    await expect(page.getByTestId('action-imported')).toHaveText(
      String(f.mode === 'dev'),
    )
    await expect(page.getByTestId('action-invoked')).toHaveText('false')

    await page.getByTestId('invoke-action').click()
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('true')

    await page.goto('about:blank')
    await f.restart()

    await page.goto(f.url('/replay'))
    await waitForHydration(page)
    await expect(page.getByTestId('inline-page')).toBeVisible()
    await expect(page.getByTestId('action-imported')).toHaveText('false')
    await page.getByTestId('invoke-action').click()
    await expect(page.getByTestId('action-imported')).toHaveText('true')
    await expect(page.getByTestId('action-invoked')).toHaveText('true')
  })
}
