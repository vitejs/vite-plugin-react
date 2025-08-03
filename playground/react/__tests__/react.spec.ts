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
  editFile('App.jsx', (code) =>
    code.replace('Vite + React', 'Vite + React Updated'),
  )
  await expect
    .poll(() => page.textContent('h1'))
    .toMatch('Hello Vite + React Updated')
  // preserve state
  expect(await page.textContent('#state-button')).toMatch('count is: 1')

  editFile('App.jsx', (code) =>
    code.replace('Vite + React Updated', 'Vite + React'),
  )
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})

test.runIf(isServe)('should not invalidate when code is invalid', async () => {
  editFile('App.jsx', (code) =>
    code.replace('<div className="App">', '<div className="App"}>'),
  )

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

test.runIf(isServe)(
  'should have annotated jsx with file location metadata',
  async () => {
    const res = await page.request.get(viteTestUrl + '/App.jsx')
    const code = await res.text()
    expect(code).toMatch(/lineNumber:\s*\d+/)
    expect(code).toMatch(/columnNumber:\s*\d+/)
  },
)

test('import attributes', async () => {
  expect(await page.textContent('.import-attributes')).toBe('ok')
})

test('React.cache API availability', async () => {
  // Test that the React.cache component renders
  expect(await page.textContent('.react-cache-test h3')).toBe(
    'React.cache Test',
  )

  // Test React.cache and React.use are available in React 19
  expect(await page.textContent('#react-cache-available')).toBe(
    'React.cache available: Yes',
  )
  expect(await page.textContent('#react-use-available')).toBe(
    'React.use available: Yes',
  )

  // Test that we can create cached functions
  expect(await page.textContent('#api-test-result')).toContain(
    'Success - created cached function of type: function',
  )
})

test('React.cache synchronous behavior', async () => {
  // Test synchronous cache behavior
  await expect.poll(() => page.textContent('#sync-result1')).toBeTruthy()
  await expect.poll(() => page.textContent('#sync-result2')).toBeTruthy()

  const result1 = await page.textContent('#sync-result1')
  const result2 = await page.textContent('#sync-result2')

  // Verify both calls return the same value (indicating caching)
  expect(result1).toBe(result2)
  expect(await page.textContent('#sync-results-equal')).toBe(
    'Results equal: true',
  )
})

test('React.cache with async operations', async () => {
  // Wait for suspense to resolve
  await expect.poll(() => page.textContent('#async-result')).toBeTruthy()

  // Verify async cache result loads
  const asyncResult = await page.textContent('#async-result')
  expect(asyncResult).toContain('Async result')
})

test('React.cache re-render behavior', async () => {
  // Get initial call count
  const initialCallCount = await page.textContent('#sync-call-count')

  // Force a re-render
  await page.click('#cache-test-rerender')

  // Wait for re-render to complete
  await expect
    .poll(() => page.textContent('#cache-test-rerender'))
    .toContain('count: 1')

  // Check that results are still equal after re-render
  expect(await page.textContent('#sync-results-equal')).toBe(
    'Results equal: true',
  )
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
        new RegExp(
          `^${escapeRegex(
            '[vite] invalidate /hmr/no-exported-comp.jsx: Could not Fast Refresh ("Foo" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/',
          )}plugin-react(?:-\\w+)?${escapeRegex(
            '#consistent-components-exports',
          )}`,
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
        new RegExp(
          `^${escapeRegex(
            '[vite] invalidate /context/CountProvider.jsx: Could not Fast Refresh ("CountContext" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react/tree/main/packages/',
          )}plugin-react(?:-\\w+)?${escapeRegex(
            '#consistent-components-exports',
          )}`,
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
          code.replace(
            'JSX import runtime works',
            'JSX import runtime updated',
          ),
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

    await expect
      .poll(() => page.textContent('#accordion-root'))
      .toMatch('Accordion Root Updated')
  })

  test('no refresh transform for non-jsx files', async () => {
    const res = await page.request.get(viteTestUrl + '/non-jsx/test.ts')
    const code = await res.text()
    expect(code).not.toContain('$RefreshReg$')
  })
}
