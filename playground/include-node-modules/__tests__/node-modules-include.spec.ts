import { expect, test } from 'vitest'
import { editFile, isServe, page } from '~utils'

test('should render', async () => {
  expect(await page.textContent('h1')).toMatch('Node Modules Include Test')
})

test('should update', async () => {
  expect(await page.textContent('#state-button')).toBe('count is: 0')
  await page.click('#state-button')
  expect(await page.textContent('#state-button')).toBe('count is: 1')
})

test.runIf(isServe)(
  'React refresh transform should run on files in node_modules (should hmr)',
  async () => {
    editFile('node_modules/@vitejs/test-package/index.jsx', (code) =>
      code.replace('Test Package', 'Test Package Updated'),
    )
    await expect
      .poll(() => page.textContent('#test-package-title'))
      .toMatch('Test Package Updated')
    // preserve state
    expect(await page.textContent('#state-button')).toBe('count is: 1')

    editFile('node_modules/@vitejs/test-package/index.jsx', (code) =>
      code.replace('Test Package Updated', 'Test Package'),
    )
    await expect
      .poll(() => page.textContent('#test-package-title'))
      .toBe('Test Package')
  },
)
