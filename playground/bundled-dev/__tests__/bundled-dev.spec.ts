import { expect, test } from 'vitest'
import { editFile, isServe, page } from '~utils'

test('should render', async () => {
  // In bundled dev mode, the page initially shows a "Bundling in progress"
  // placeholder and reloads once the bundle is ready.
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})

test('should update', async () => {
  expect(await page.textContent('#state-button')).toMatch('count is: 0')
  await page.click('#state-button')
  expect(await page.textContent('#state-button')).toMatch('count is: 1')
})

test.runIf(isServe)('should hmr', async () => {
  editFile('src/App.tsx', (code) =>
    code.replace('Vite + React', 'Vite + React Updated'),
  )
  await expect
    .poll(() => page.textContent('h1'))
    .toMatch('Hello Vite + React Updated')
  // preserve state
  expect(await page.textContent('#state-button')).toMatch('count is: 1')

  editFile('src/App.tsx', (code) =>
    code.replace('Vite + React Updated', 'Vite + React'),
  )
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})
