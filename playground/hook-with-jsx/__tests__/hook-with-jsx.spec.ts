import { expect, test } from 'vitest'
import { editFile, isServe, page, untilBrowserLogAfter } from '~utils'

test('should render', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
})

if (isServe) {
  test('Hook with JSX HMR', async () => {
    editFile('src/useButtonHook.tsx', (code) =>
      code.replace('count is {count}', 'count is {count}!'),
    )
    await untilBrowserLogAfter(() => page.textContent('button'), '[vite] hot updated: /src/App.tsx')
    await expect.poll(() => page.textContent('button')).toMatch('count is 1!')
  })
}
