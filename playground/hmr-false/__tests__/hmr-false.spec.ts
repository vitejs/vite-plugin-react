import { expect, test } from 'vitest'
import { page } from '~utils'

test.skipIf(process.env.VITE_TEST_FULL_BUNDLE_MODE)('basic', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
})

/*
  Need to fix the following scenario:

  1. the loading page is opened
  2. the build finishes successfully and the reload event is sent
  3. WS connection is established on the loading page
  4. No reload happens because the reload event is already sent
*/
