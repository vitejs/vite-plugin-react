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

test('.md extension should work', async () => {
  expect(await page.getByText('.md extension works.').textContent()).toEqual(
    '.md extension works. This is bold text.',
  )
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

  test('should hmr with .md extension', async () => {
    await untilBrowserLogAfter(
      () =>
        editFile('src/demo2.md', (code) =>
          code.replace('`.md` extension works.', '`.md` extension hmr works.'),
        ),
      '[vite] hot updated: /src/demo2.md',
    )
    await untilUpdated(
      () => page.getByText('.md extension hmr works.').textContent(),
      '.md extension hmr works. This is bold text.',
    )
  })
}
