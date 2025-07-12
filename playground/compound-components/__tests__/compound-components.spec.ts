import { expect, test } from 'vitest'
import { editFile, page, untilBrowserLogAfter } from '~utils'

test('should render compound components', async () => {
  expect(await page.textContent('h1')).toMatch('Compound Components HMR Test')
  expect(await page.textContent('h3')).toMatch('Accordion Root')
})

test('compound components should use HMR instead of full reload', async () => {
  const logs = await untilBrowserLogAfter(() => {
    editFile('src/Accordion.tsx', (code) =>
      code.replace('Accordion Root', 'Accordion Root Updated'),
    )
  }, /\[vite\]/)

  expect(logs).toContain('[vite] hot updated: /src/Accordion.tsx')
  expect(logs).not.toContain('[vite] invalidate')

  // revert changes
  editFile('src/Accordion.tsx', (code) =>
    code.replace('Accordion Root Updated', 'Accordion Root'),
  )
})
