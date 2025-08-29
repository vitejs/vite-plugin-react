import { expect, test } from 'vitest'
import { page } from '~utils'

test('should render', async () => {
  await expect
    .poll(() => page.textContent('h1'))
    .toMatch('Node Modules Include Test')
})

test('babel should run on files in node_modules', async () => {
  expect(await page.textContent('.result')).toMatch('Result: true')
})
