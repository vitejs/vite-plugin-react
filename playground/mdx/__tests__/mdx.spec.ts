import { expect, test } from 'vitest'
import { editFile, isServe, page, untilBrowserLogAfter } from '~utils'

test('should render', async () => {
  await expect.poll(() => page.textContent('h1')).toMatch('Vite + MDX')
})

test('.md extension should work', async () => {
  expect(await page.getByText('.md extension works.').textContent()).toEqual(
    '.md extension works. This is bold text.',
  )
})

if (isServe) {
  test('should hmr', async () => {
    editFile('src/demo.mdx', (code) => code.replace('Vite + MDX', 'Updated'))
    // await untilBrowserLogAfter(
    //   () => page.textContent('h1'),
    //   '[vite] hot updated: /src/demo.mdx',
    // )
    await expect.poll(() => page.textContent('h1')).toMatch('Updated')
  })

  test('should hmr with .md extension', async () => {
    editFile('src/demo2.md', (code) =>
      code.replace('`.md` extension works.', '`.md` extension hmr works.'),
    )
    // await untilBrowserLogAfter(
    //   () =>
    //     editFile('src/demo2.md', (code) =>
    //       code.replace('`.md` extension works.', '`.md` extension hmr works.'),
    //     ),
    //   '[vite] hot updated: /src/demo2.md',
    // )
    await expect
      .poll(() => page.getByText('.md extension hmr works.').textContent())
      .toMatch('.md extension hmr works. This is bold text.')
  })
}
