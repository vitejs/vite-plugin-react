import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dynamic-import-glob', () => {
  const root = 'examples/e2e/temp/dynamic-import-glob'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        // Template literal dynamic imports are reported as globs by
        // es-module-lexer (e.g. "file://*"), which are not module ids.
        'src/load.ts': /* ts */ `
          export function loadFile(path: string) {
            return import(/* @vite-ignore */ \`file://\${path}\`)
          }

          export function loadVersioned(file: string, version: string) {
            return import(/* @vite-ignore */ \`\${file}?v=\${version}\`)
          }

          export async function loadLocale(locale: string): Promise<string> {
            return (await import(\`./locales/\${locale}.ts\`)).default
          }
        `,
        'src/locales/en.ts': /* ts */ `
          export default '[locale-en]'
        `,
        'src/root.tsx': /* tsx */ `
          import { ClientCounter } from './client.tsx'
          import { loadLocale } from './load.ts'

          export async function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <div data-testid="locale">{await loadLocale('en')}</div>
                  <ClientCounter />
                </body>
              </html>
            )
          }
        `,
      },
    })
  })

  function defineTest(f: Fixture) {
    test('basic', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('locale')).toHaveText('[locale-en]')
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
