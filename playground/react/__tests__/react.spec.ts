import { expect, test } from 'vitest'
import {
  editFile,
  isBuild,
  isServe,
  page,
  untilBrowserLogAfter,
  untilUpdated,
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
  editFile('App.jsx', (code) =>
    code.replace('Vite + React', 'Vite + React Updated'),
  )
  await untilUpdated(() => page.textContent('h1'), 'Hello Vite + React Updated')
  // preserve state
  expect(await page.textContent('#state-button')).toMatch('count is: 1')

  editFile('App.jsx', (code) =>
    code.replace('Vite + React Updated', 'Vite + React'),
  )
  await untilUpdated(() => page.textContent('h1'), 'Hello Vite + React')
})

test.runIf(isServe)('should not invalidate when code is invalid', async () => {
  editFile('App.jsx', (code) =>
    code.replace('<div className="App">', '<div className="App"}>'),
  )

  await untilUpdated(
    () => page.textContent('vite-error-overlay .message-body'),
    'Unexpected token',
  )
  // if import.meta.invalidate happened, the old page won't be shown because the page is reloaded
  expect(await page.textContent('h1')).toMatch('Hello Vite + React')

  editFile('App.jsx', (code) =>
    code.replace('<div className="App"}>', '<div className="App">'),
  )
})

test.runIf(isServe)(
  'should have annotated jsx with file location metadata',
  async () => {
    const meta = await page.evaluate(() => {
      const button = document.querySelector('#state-button')
      const key = Object.keys(button).find(
        (key) => key.indexOf('__reactFiber') === 0,
      )
      return button[key]._debugSource
    })
    // If the evaluate call doesn't crash, and the returned metadata has
    // the expected fields, we're good.
    expect(Object.keys(meta).sort()).toEqual([
      'columnNumber',
      'fileName',
      'lineNumber',
    ])
  },
)

test('import attributes', async () => {
  expect(await page.textContent('.import-attributes')).toBe('ok')
})

if (!isBuild) {
  // #9869
  test('should only hmr files with exported react components', async () => {
    await untilBrowserLogAfter(
      () =>
        editFile('hmr/no-exported-comp.jsx', (code) =>
          code.replace('An Object', 'Updated'),
        ),
      [
        '[vite] invalidate /hmr/no-exported-comp.jsx: Could not Fast Refresh ("Foo" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports',
        '[vite] hot updated: /hmr/no-exported-comp.jsx',
        '[vite] hot updated: /hmr/parent.jsx',
        'Parent rendered',
      ],
    )
    await untilUpdated(() => page.textContent('#parent'), 'Updated')
  })

  // #3301
  test('should hmr react context', async () => {
    expect(await page.textContent('#context-button')).toMatch(
      'context-based count is: 0',
    )
    await page.click('#context-button')
    expect(await page.textContent('#context-button')).toMatch(
      'context-based count is: 1',
    )

    await untilBrowserLogAfter(
      () =>
        editFile('context/CountProvider.jsx', (code) =>
          code.replace('context provider', 'context provider updated'),
        ),
      [
        '[vite] invalidate /context/CountProvider.jsx: Could not Fast Refresh ("CountContext" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports',
        '[vite] hot updated: /context/CountProvider.jsx',
        '[vite] hot updated: /App.jsx',
        '[vite] hot updated: /context/ContextButton.jsx',
        'Parent rendered',
      ],
    )
    await untilUpdated(
      () => page.textContent('#context-provider'),
      'context provider updated',
    )
  })

  test('should hmr files with "react/jsx-runtime"', async () => {
    expect(await page.textContent('#state-button')).toMatch('count is: 0')
    await page.click('#state-button')
    expect(await page.textContent('#state-button')).toMatch('count is: 1')

    await untilBrowserLogAfter(
      () =>
        editFile('hmr/jsx-import-runtime.js', (code) =>
          code.replace(
            'JSX import runtime works',
            'JSX import runtime updated',
          ),
        ),
      ['[vite] hot updated: /hmr/jsx-import-runtime.js'],
    )
    await untilUpdated(
      () => page.textContent('#jsx-import-runtime'),
      'JSX import runtime updated',
    )

    expect(await page.textContent('#state-button')).toMatch('count is: 1')
  })
}
