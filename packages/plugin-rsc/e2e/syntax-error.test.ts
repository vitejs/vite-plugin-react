import { test, expect } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/syntax-error'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/root.tsx': /* tsx */ `
          import { TestSyntaxErrorClient } from './client.tsx'
          import { TestSyntaxErrorServer } from './server.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <TestSyntaxErrorClient />
                  <TestSyntaxErrorServer />
                </body>
              </html>
            )
          }
        `,
        'src/client.tsx': /* tsx */ `
          "use client";
          import { useState } from 'react'

          export function TestSyntaxErrorClient() {
            const [triggerError, setTriggerError] = useState(false)
            
            return (
              <div data-testid="client-syntax-ready">
                <button 
                  onClick={() => setTriggerError(true)}
                  data-testid="trigger-client-syntax-error"
                >
                  Trigger Client Syntax Error
                </button>
                {triggerError && <div>Client ready for syntax error</div>}
              </div>
            )
          }
        `,
        'src/server.tsx': /* tsx */ `
          export function TestSyntaxErrorServer() {
            return (
              <div data-testid="server-syntax-ready">
                Server ready for syntax error testing
              </div>
            )
          }
        `,
      },
    })
  })

  function defineSyntaxErrorTests(f: Fixture) {
    test('client syntax error triggers error overlay', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)

      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()

      // Edit client file to introduce syntax error
      const editor = f.createEditor('src/client.tsx')
      editor.edit((s) =>
        s.replace(
          'export function TestSyntaxErrorClient() {',
          'export function TestSyntaxErrorClient() { const invalid = ;',
        ),
      )

      // Should see error overlay
      await expect(page.locator('vite-error-overlay')).toBeVisible({
        timeout: 5000,
      })

      // Fix syntax error
      editor.reset()

      // Error overlay should disappear and page should work
      await expect(page.locator('vite-error-overlay')).not.toBeVisible({
        timeout: 5000,
      })
      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
    })

    test('server syntax error triggers error overlay', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)

      await expect(page.getByTestId('server-syntax-ready')).toBeVisible()

      // Edit server file to introduce syntax error
      const editor = f.createEditor('src/server.tsx')
      editor.edit((s) =>
        s.replace(
          'export function TestSyntaxErrorServer() {',
          'export function TestSyntaxErrorServer() { const invalid = ;',
        ),
      )

      // Should see error overlay
      await expect(page.locator('vite-error-overlay')).toBeVisible({
        timeout: 5000,
      })

      // Fix syntax error
      editor.reset()

      // Error overlay should disappear and server HMR should work
      await expect(page.locator('vite-error-overlay')).not.toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByTestId('server-syntax-ready')).toBeVisible()
    })

    test('initial SSR with server component syntax error shows error page', async ({
      page,
    }) => {
      // Edit server file to introduce syntax error before navigation
      const editor = f.createEditor('src/server.tsx')
      editor.edit((s) =>
        s.replace(
          'export function TestSyntaxErrorServer() {',
          'export function TestSyntaxErrorServer() { const invalid = ;',
        ),
      )

      // Navigate to page with syntax error
      await page.goto(f.url())

      // Should see error content (check for the actual error text visible in the output)
      await expect(page.locator('body')).toContainText(
        'Transform failed with 1 error',
      )

      // Fix syntax error
      editor.reset()

      // Wait a bit for file system changes to be detected
      await page.waitForTimeout(100)

      // Should work normally now
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('server-syntax-ready')).toBeVisible()
    })

    test('initial SSR with client component syntax error shows error page', async ({
      page,
    }) => {
      // Edit client file to introduce syntax error before navigation
      const editor = f.createEditor('src/client.tsx')
      editor.edit((s) =>
        s.replace(
          'export function TestSyntaxErrorClient() {',
          'export function TestSyntaxErrorClient() { const invalid = ;',
        ),
      )

      // Navigate to page with syntax error
      await page.goto(f.url())

      // Should see error content (client syntax errors during SSR)
      await expect(page.locator('body')).toContainText('Unexpected token')

      // Fix syntax error
      editor.reset()

      // Wait a bit for file system changes to be detected
      await page.waitForTimeout(100)

      // Should work normally now
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineSyntaxErrorTests(f)
  })
})
