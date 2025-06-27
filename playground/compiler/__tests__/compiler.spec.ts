import { expect, test } from 'vitest'
import { editFile, isServe, page } from '~utils'

test('should render', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
})

test.runIf(isServe)('should hmr', async () => {
  editFile('src/App.tsx', (code) =>
    code.replace('count is {count}', 'count is {count}!'),
  )
  await expect.poll(() => page.textContent('button')).toMatch('count is 1!')
})
