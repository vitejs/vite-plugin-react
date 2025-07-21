import { expect, test } from 'vitest'
import { editFile, isServe, page, viteTestUrl } from '~utils'

test('should render', async () => {
  expect(await page.textContent('h1')).toMatch('Hello Vite + React')
})

test('should update', async () => {
  expect(await page.textContent('button')).toMatch('count is: 0')
  await page.click('button')
  expect(await page.textContent('button')).toMatch('count is: 1')
})

test.runIf(isServe)('should hmr', async () => {
  editFile('App.jsx', (code) => code.replace('Vite + React', 'Updated'))
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Updated')
  // preserve state
  expect(await page.textContent('button')).toMatch('count is: 1')
})

if (!process.env.VITE_TEST_FULL_BUNDLE_MODE){
  test.runIf(isServe)(
    'should have annotated jsx with file location metadata',
    async () => {
      const res = await page.request.get(viteTestUrl + '/App.jsx')
      const code = await res.text()
      expect(code).toMatch(/lineNumber:\s*\d+/)
      expect(code).toMatch(/columnNumber:\s*\d+/)
    },
  )
}
