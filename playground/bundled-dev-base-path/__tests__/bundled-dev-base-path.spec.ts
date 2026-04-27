import { expect, test } from 'vitest'
import { browserErrors, isServe, page, viteTestUrl } from '~utils'

// Regression test for https://github.com/vitejs/vite-plugin-react/issues/1190
// bundledDev mode with a non-root base should not fail to resolve /@react-refresh.
test.runIf(isServe)(
  'should load without UNRESOLVED_IMPORT error for @react-refresh',
  async () => {
    await page.goto(viteTestUrl)
    // bundledDev shows "Bundling in progress" until the first bundle is ready.
    await page.waitForSelector('h1')
    await expect
      .poll(() => page.textContent('h1'))
      .toMatch('bundledDev + base path')
    expect(browserErrors).toHaveLength(0)
  },
)

test.runIf(isServe)('should render and update state', async () => {
  await page.goto(viteTestUrl)
  await page.waitForSelector('#state-button')
  await expect
    .poll(() => page.textContent('#state-button'))
    .toMatch('count is: 0')
  await page.click('#state-button')
  await expect
    .poll(() => page.textContent('#state-button'))
    .toMatch('count is: 1')
})
