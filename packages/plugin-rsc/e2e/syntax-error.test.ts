import { test, expect } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration, expectNoReload } from './helper'

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
            const [count, setCount] = useState(0)
            
            return (
              <div data-testid="client-syntax-ready">
                <button 
                  onClick={() => setCount(count + 1)}
                  data-testid="client-counter"
                >
                  Client Count: {count}
                </button>
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

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineSyntaxErrorTests(f)
  })
})

function defineSyntaxErrorTests(f: Fixture) {
  test('client syntax error triggers error overlay', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)

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
    await expect(page.locator('vite-error-overlay')).toBeVisible()

    // Fix syntax error
    editor.reset()

    // Error overlay should disappear and page should work
    await expect(page.locator('vite-error-overlay')).not.toBeVisible()
    await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
  })

  test('server syntax error triggers error overlay', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)

    await expect(page.getByTestId('server-syntax-ready')).toBeVisible()

    // Set client state to verify it's preserved after server HMR
    await page.getByTestId('client-counter').click()
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )

    // Edit server file to introduce syntax error
    const editor = f.createEditor('src/server.tsx')
    editor.edit((s) =>
      s.replace(
        'export function TestSyntaxErrorServer() {',
        'export function TestSyntaxErrorServer() { const invalid = ;',
      ),
    )

    // Should see error overlay
    await expect(page.locator('vite-error-overlay')).toBeVisible()

    // Fix syntax error
    editor.reset()

    // Error overlay should disappear and server should work again
    await expect(page.locator('vite-error-overlay')).not.toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByTestId('server-syntax-ready')).toBeVisible()

    // Verify client state is preserved (no full reload happened)
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )
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

    // Should see error content
    await expect(page.locator('body')).toContainText(
      'Transform failed with 1 error',
    )

    // Fix syntax error
    editor.reset()

    // Should work normally now - retry with more lenient approach
    await expect(async () => {
      await page.goto(f.url())
      // Check if we're still getting an error page
      const bodyText = await page.locator('body').textContent()
      if (bodyText?.includes('Transform failed with 1 error')) {
        throw new Error('Still seeing error page')
      }
      await waitForHydration(page)
      await expect(page.getByTestId('server-syntax-ready')).toBeVisible()
    }).toPass({ timeout: 15000 })
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

    // Should see error content
    await expect(page.locator('body')).toContainText(
      'Transform failed with 1 error',
    )

    // Fix syntax error
    editor.reset()

    // Should work normally now
    await expect(async () => {
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
    }).toPass()
  })
}
