import { expect, test } from 'vitest'
import { page } from '~utils'

test('app works with NODE_ENV=production', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  await page.click('button')
  expect(await page.textContent('button')).toMatch('count is 1')
})
