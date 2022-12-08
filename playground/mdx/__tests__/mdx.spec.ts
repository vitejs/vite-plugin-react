import { expect, test } from 'vitest'
import {
  editFile,
  isServe,
  page,
  untilBrowserLogAfter,
  untilUpdated,
} from '~utils'

test('should render', async () => {
  expect(await page.textContent('h1')).toMatch('Vite + MDX')
})

if (isServe) {
  test('should hmr', async () => {
    editFile('src/demo.mdx', (code) => code.replace('Vite + MDX', 'Updated'))
    await untilBrowserLogAfter(
      () => page.textContent('h1'),
      '[vite] hot updated: /src/demo.mdx',
    )
    await untilUpdated(() => page.textContent('h1'), 'Updated')
  })
}
