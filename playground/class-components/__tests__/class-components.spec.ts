import { expect, test } from 'vitest'
import {
  editFile,
  isServe,
  page,
  untilBrowserLogAfter,
  untilUpdated,
} from '~utils'

test('should render', async () => {
  expect(await page.textContent('span')).toMatch('Hello World')
})

if (isServe) {
  test('Class component HMR', async () => {
    editFile('src/App.tsx', (code) => code.replace('World', 'class components'))
    await untilBrowserLogAfter(
      () => page.textContent('span'),
      '[vite] hot updated: /src/App.tsx',
    )
    await untilUpdated(() => page.textContent('span'), 'Hello class components')

    editFile('src/utils.tsx', (code) => code.replace('Hello', 'Hi'))
    await untilBrowserLogAfter(
      () => page.textContent('span'),
      '[vite] hot updated: /src/App.tsx',
    )
    await untilUpdated(() => page.textContent('span'), 'Hi class components')
  })
}
