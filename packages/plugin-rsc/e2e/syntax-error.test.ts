import { test, expect } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
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

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <TestSyntaxErrorClient />
                  <div data-testid="server-content">server:ok</div>
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
                <div data-testid="client-content">client:ok</div>
              </div>
            )
          }
        `,
      },
    })
  })

  test.describe(() => {
    const f = useFixture({ root, mode: 'dev' })

    test('client hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await expect(page.getByTestId('client-content')).toHaveText('client:ok')

      // Set client state to verify preservation after HMR
      await page.getByTestId('client-counter').click()
      await expect(page.getByTestId('client-counter')).toHaveText(
        'Client Count: 1',
      )

      // add syntax error
      const editor = f.createEditor('src/client.tsx')
      editor.edit((s) =>
        s.replace(
          '<div data-testid="client-content">client:ok</div>',
          '<div data-testid="client-content">client:broken<</div>',
        ),
      )
      await expect(page.locator('vite-error-overlay')).toBeVisible()

      // fix syntax error
      await page.waitForTimeout(200)
      editor.edit((s) =>
        s.replace(
          '<div data-testid="client-content">client:broken<</div>',
          '<div data-testid="client-content">client:fixed</div>',
        ),
      )
      await expect(page.locator('vite-error-overlay')).not.toBeVisible()
      await expect(page.getByTestId('client-syntax-ready')).toBeVisible()
      await expect(page.getByTestId('client-content')).toHaveText(
        'client:fixed',
      )
      await expect(page.getByTestId('client-counter')).toHaveText(
        'Client Count: 1',
      )
    })
  })

  test.describe(() => {
    const f = useFixture({ root, mode: 'dev' })

    test('server hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      await expect(page.getByTestId('server-content')).toHaveText('server:ok')

      // Set client state to verify preservation during server HMR
      await page.getByTestId('client-counter').click()
      await expect(page.getByTestId('client-counter')).toHaveText(
        'Client Count: 1',
      )

      // add syntax error
      const editor = f.createEditor('src/root.tsx')
      editor.edit((s) =>
        s.replace(
          '<div data-testid="server-content">server:ok</div>',
          '<div data-testid="server-content">server:broken<</div>',
        ),
      )
      await expect(page.locator('vite-error-overlay')).toBeVisible()

      // fix syntax error
      await page.waitForTimeout(200)
      editor.edit((s) =>
        s.replace(
          '<div data-testid="server-content">server:broken<</div>',
          '<div data-testid="server-content">server:fixed</div>',
        ),
      )
      await expect(page.locator('vite-error-overlay')).not.toBeVisible()
      await expect(page.getByTestId('server-content')).toHaveText(
        'server:fixed',
      )
      await expect(page.getByTestId('client-counter')).toHaveText(
        'Client Count: 1',
      )
    })
  })

  test.describe(() => {
    const f = useFixture({ root, mode: 'dev' })

    test('client ssr', async ({ page }) => {
      // add syntax error
      const editor = f.createEditor('src/client.tsx')
      editor.edit((s) =>
        s.replace(
          '<div data-testid="client-content">client:ok</div>',
          '<div data-testid="client-content">client:broken<</div>',
        ),
      )
      await page.goto(f.url())
      await expect(page.locator('body')).toContainText('src/client.tsx:15')

      // fix syntax error
      await page.waitForTimeout(200)
      editor.edit((s) =>
        s.replace(
          '<div data-testid="client-content">client:broken<</div>',
          '<div data-testid="client-content">client:fixed</div>',
        ),
      )
      await expect(async () => {
        await page.goto(f.url())
        await waitForHydration(page)
        await expect(page.getByTestId('client-content')).toHaveText(
          'client:fixed',
        )
      }).toPass()
    })
  })

  test.describe(() => {
    const f = useFixture({ root, mode: 'dev' })

    test('server ssr', async ({ page }) => {
      // add syntax error
      const editor = f.createEditor('src/root.tsx')
      editor.edit((s) =>
        s.replace(
          '<div data-testid="server-content">server:ok</div>',
          '<div data-testid="server-content">server:broken<</div>',
        ),
      )
      await page.goto(f.url())
      await expect(page.locator('body')).toContainText('src/root.tsx:11')

      // fix syntax error
      await page.waitForTimeout(200)
      editor.edit((s) =>
        s.replace(
          '<div data-testid="server-content">server:broken<</div>',
          '<div data-testid="server-content">server:fixed</div>',
        ),
      )
      await expect(async () => {
        await page.goto(f.url())
        await waitForHydration(page)
        await expect(page.getByTestId('server-content')).toHaveText(
          'server:fixed',
        )
      }).toPass()
    })
  })
})
