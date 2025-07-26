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

    // Set client state to verify preservation after HMR
    await page.getByTestId('client-counter').click()
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )

    // Introduce syntax error and verify error overlay
    const editor = f.createEditor('src/client.tsx')
    editor.edit((s) =>
      s.replace(
        'export function TestSyntaxErrorClient() {',
        'export function TestSyntaxErrorClient() { const invalid = ;',
      ),
    )
    await expect(page.locator('vite-error-overlay')).toBeVisible()

    // Fix error and verify recovery with preserved client state
    editor.reset()
    await expect(page.locator('vite-error-overlay')).not.toBeVisible()
    await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )
  })

  test('server syntax error triggers error overlay', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)

    // Set client state to verify preservation during server HMR
    await page.getByTestId('client-counter').click()
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )

    // Introduce server syntax error and verify error overlay
    const editor = f.createEditor('src/server.tsx')
    editor.edit((s) =>
      s.replace(
        'export function TestSyntaxErrorServer() {',
        'export function TestSyntaxErrorServer() { const invalid = ;',
      ),
    )
    await expect(page.locator('vite-error-overlay')).toBeVisible()

    // Fix error and verify recovery with preserved client state
    editor.reset()
    await expect(page.locator('vite-error-overlay')).not.toBeVisible()
    await expect(page.getByTestId('server-syntax-ready')).toBeVisible()
    await expect(page.getByTestId('client-counter')).toHaveText(
      'Client Count: 1',
    )
  })

  test('initial SSR with server component syntax error shows error page', async ({
    page,
  }) => {
    // Introduce server syntax error and navigate to page
    const editor = f.createEditor('src/server.tsx')
    editor.edit((s) =>
      s.replace(
        'export function TestSyntaxErrorServer() {',
        'export function TestSyntaxErrorServer() { const invalid = ;',
      ),
    )
    await page.goto(f.url())
    await expect(page.locator('body')).toContainText(
      'Transform failed with 1 error',
    )

    // Fix error and verify recovery
    editor.reset()
    await expect(async () => {
      await page.goto(f.url())
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
    // Introduce client syntax error and navigate to page
    const editor = f.createEditor('src/client.tsx')
    editor.edit((s) =>
      s.replace(
        'export function TestSyntaxErrorClient() {',
        'export function TestSyntaxErrorClient() { const invalid = ;',
      ),
    )
    await page.goto(f.url())
    await expect(page.locator('body')).toContainText(
      'Transform failed with 1 error',
    )

    // Fix error and verify recovery
    editor.reset()
    await expect(async () => {
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
    }).toPass()
  })
}
