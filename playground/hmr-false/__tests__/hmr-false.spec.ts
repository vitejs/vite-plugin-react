import { expect, test } from 'vitest'
import { page } from '~utils'

test('basic', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
})
