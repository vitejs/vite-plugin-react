import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/ssg',
    mode: 'dev',
  })
  defineTestSsg(f)
})

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/ssg',
    mode: 'build',
  })
  defineTestSsg(f)
})

function defineTestSsg(f: Fixture) {
  test('basic', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)

    if (f.mode === 'build') {
      const t1 = await page.getByTestId('timestamp').textContent()
      await page.waitForTimeout(100)
      await page.reload()
      await waitForHydration(page)
      const t2 = await page.getByTestId('timestamp').textContent()
      expect(t2).toBe(t1)
    }
  })
}
