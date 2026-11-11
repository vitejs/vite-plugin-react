import { expect, test } from '@playwright/test'
import { type Fixture, setupInlineFixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'
import { defineStarterTest } from './starter'

// Test `rscCssTransform: false` option which disables automatic CSS injection
// and requires manual use of `import.meta.viteRsc.loadCss()`.

test.describe('manual-css', () => {
  const root = 'examples/e2e/temp/manual-css'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        // Disable auto CSS injection
        'vite.config.ts': {
          edit: (s) => s.replace('rsc()', `rsc({ rscCssTransform: false })`),
        },
        // Add manual loadCss() call since auto-injection is disabled
        'src/root.tsx': {
          edit: (s) =>
            s.replace('</head>', `{import.meta.viteRsc.loadCss()}</head>`),
        },
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})

// Test `import.meta.viteRsc.loadCss(id)` called with different ids in one module.
// Each call needs its own import of the importer's resources.

test.describe('manual-css-multiple-ids', () => {
  const root = 'examples/e2e/temp/manual-css-multiple-ids'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (s) => s.replace('rsc()', `rsc({ rscCssTransform: false })`),
        },
        'src/root.tsx': /* tsx */ `
          import { TestA } from './a.tsx'
          import { TestB } from './b.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                  {import.meta.viteRsc.loadCss('./a.tsx')}
                  {import.meta.viteRsc.loadCss('./b.tsx')}
                </head>
                <body>
                  <TestA />
                  <TestB />
                </body>
              </html>
            )
          }
        `,
        'src/a.tsx': /* tsx */ `
          import './a.css'

          export function TestA() {
            return <div className="test-a">a</div>
          }
        `,
        'src/a.css': `.test-a { color: rgb(255, 0, 0); }`,
        'src/b.tsx': /* tsx */ `
          import './b.css'

          export function TestB() {
            return <div className="test-b">b</div>
          }
        `,
        'src/b.css': `.test-b { color: rgb(0, 0, 255); }`,
      },
    })
  })

  function defineTest(f: Fixture) {
    test('basic', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.locator('.test-a')).toHaveCSS('color', 'rgb(255, 0, 0)')
      await expect(page.locator('.test-b')).toHaveCSS('color', 'rgb(0, 0, 255)')
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest(f)
  })
})
