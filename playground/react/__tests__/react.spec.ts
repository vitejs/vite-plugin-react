import { expect, test } from 'vitest'
import {
  editFile,
  escapeRegex,
  isBuild,
  isServe,
  page,
  untilBrowserLogAfter,
  viteTestUrl,
} from '~utils'

test('should render', async () => {
  expect(await page.textContent('h1')).toMatch('Hello Vite + React')
})

test('should update', async () => {
  expect(await page.textContent('#state-button')).toMatch('count is: 0')
  await page.click('#state-button')
  expect(await page.textContent('#state-button')).toMatch('count is: 1')
})

test.runIf(isServe)('should hmr', async () => {
  editFile('App.jsx', (code) => code.replace('Vite + React', 'Vite + React Updated'))
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React Updated')
  // preserve state
  expect(await page.textContent('#state-button')).toMatch('count is: 1')

  editFile('App.jsx', (code) => code.replace('Vite + React Updated', 'Vite + React'))
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})

test.runIf(isServe)('should hmr files with queries', async () => {
  expect(await page.textContent('#WithQuery')).toBe('With Query')

  expect(await page.textContent('#WithQuery-button')).toMatch('count is: 0')
  await page.click('#WithQuery-button')
  expect(await page.textContent('#WithQuery-button')).toMatch('count is: 1')

  editFile('components/WithQuery.jsx', (code) => code.replace('With Query', 'With Query Updated'))
  await expect.poll(() => page.textContent('#WithQuery')).toBe('With Query Updated')
  // preserve state
  expect(await page.textContent('#WithQuery-button')).toMatch('count is: 1')

  editFile('components/WithQuery.jsx', (code) => code.replace('With Query Updated', 'With Query'))
  await expect.poll(() => page.textContent('#WithQuery')).toBe('With Query')
})

test.runIf(isServe)('should not invalidate when code is invalid', async () => {
  editFile('App.jsx', (code) => code.replace('<div className="App">', '<div className="App"}>'))

  await expect
    .poll(() => page.textContent('vite-error-overlay .message-body'))
    .toMatch('Unexpected token')
  // if import.meta.invalidate happened, the old page won't be shown because the page is reloaded
  expect(await page.textContent('h1')).toMatch('Hello Vite + React')

  await untilBrowserLogAfter(
    () =>
      editFile('App.jsx', (code) =>
        code.replace('<div className="App"}>', '<div className="App">'),
      ),
    '[vite] hot updated: /App.jsx',
  )
})

test.runIf(isServe)('should have annotated jsx with file location metadata', async () => {
  const res = await page.request.get(viteTestUrl + '/App.jsx')
  const code = await res.text()
  expect(code).toMatch(/lineNumber:\s*\d+/)
  expect(code).toMatch(/columnNumber:\s*\d+/)
})

test('import attributes', async () => {
  expect(await page.textContent('.import-attributes')).toBe('ok')
})

if (!isBuild) {
  // #9869
  test('should only hmr files with exported react components', async () => {
    await untilBrowserLogAfter(
      () => editFile('hmr/no-exported-comp.jsx', (code) => code.replace('An Object', 'Updated')),
      [
        new RegExp(
          `^${escapeRegex(
            '[vite] invalidate /hmr/no-exported-comp.jsx: Could not Fast Refresh ("Foo" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/',
          )}plugin-react(?:-\\w+)?${escapeRegex('#consistent-components-exports')}`,
        ),
        '[vite] hot updated: /hmr/no-exported-comp.jsx',
        '[vite] hot updated: /hmr/parent.jsx',
        'Parent rendered',
      ],
    )
    await expect.poll(() => page.textContent('#parent')).toMatch('Updated')
  })

  // #3301
  test('should hmr react context', async () => {
    expect(await page.textContent('#context-button')).toMatch('context-based count is: 0')
    await page.click('#context-button')
    expect(await page.textContent('#context-button')).toMatch('context-based count is: 1')

    await untilBrowserLogAfter(
      () =>
        editFile('context/CountProvider.jsx', (code) =>
          code.replace('context provider', 'context provider updated'),
        ),
      [
        new RegExp(
          `^${escapeRegex(
            '[vite] invalidate /context/CountProvider.jsx: Could not Fast Refresh ("CountContext" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/',
          )}plugin-react(?:-\\w+)?${escapeRegex('#consistent-components-exports')}`,
        ),
        '[vite] hot updated: /context/CountProvider.jsx',
        '[vite] hot updated: /App.jsx',
        '[vite] hot updated: /context/ContextButton.jsx',
        'Parent rendered',
      ],
    )
    await expect
      .poll(() => page.textContent('#context-provider'))
      .toMatch('context provider updated')
  })

  test('should hmr files with "react/jsx-runtime"', async () => {
    expect(await page.textContent('#state-button')).toMatch('count is: 0')
    await page.click('#state-button')
    expect(await page.textContent('#state-button')).toMatch('count is: 1')

    await untilBrowserLogAfter(
      () =>
        editFile('hmr/jsx-import-runtime.js', (code) =>
          code.replace('JSX import runtime works', 'JSX import runtime updated'),
        ),
      ['[vite] hot updated: /hmr/jsx-import-runtime.js'],
    )
    await expect
      .poll(() => page.textContent('#jsx-import-runtime'))
      .toMatch('JSX import runtime updated')

    expect(await page.textContent('#state-button')).toMatch('count is: 1')
  })

  // #493
  test('should hmr compound components', async () => {
    await untilBrowserLogAfter(
      () =>
        editFile('components/Accordion.jsx', (code) =>
          code.replace('Accordion Root', 'Accordion Root Updated'),
        ),
      ['[vite] hot updated: /components/Accordion.jsx'],
    )

    await expect.poll(() => page.textContent('#accordion-root')).toMatch('Accordion Root Updated')
  })

  test('no refresh transform for non-jsx files', async () => {
    const res = await page.request.get(viteTestUrl + '/non-jsx/test.ts')
    const code = await res.text()
    expect(code).not.toContain('$RefreshReg$')
  })
}
