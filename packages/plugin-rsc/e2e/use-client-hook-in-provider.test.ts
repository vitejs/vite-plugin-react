import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

// Regression test for the cold-start optimizer-cache version drift that
// caused `Invalid hook call` when a `'use client'` third-party package
// synchronously called a React hook in a Provider on first paint.
// https://github.com/vitejs/vite-plugin-react/issues/1213
test.describe(() => {
  const root = 'examples/e2e/temp/use-client-hook-in-provider'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'package.json': /* json */ `
          {
            "name": "@vitejs/plugin-rsc-examples-use-client-hook-in-provider",
            "version": "0.0.0",
            "private": true,
            "license": "MIT",
            "type": "module",
            "scripts": {
              "dev": "vite",
              "build": "vite build",
              "preview": "vite preview"
            },
            "dependencies": {
              "react": "^19.2.6",
              "react-dom": "^19.2.6",
              "@vitejs/test-dep-use-client-hook-in-provider": "*"
            },
            "devDependencies": {
              "@types/react": "^19.2.14",
              "@types/react-dom": "^19.2.3",
              "@vitejs/plugin-react": "latest",
              "@vitejs/plugin-rsc": "latest",
              "rsc-html-stream": "^0.0.7",
              "vite": "^8.0.10"
            }
          }
        `,
        'node_modules/@vitejs/test-dep-use-client-hook-in-provider/package.json': /* json */ `
          {
            "name": "@vitejs/test-dep-use-client-hook-in-provider",
            "private": true,
            "type": "module",
            "exports": "./index.js",
            "peerDependencies": { "react": "*" }
          }
        `,
        'node_modules/@vitejs/test-dep-use-client-hook-in-provider/index.js': /* js */ `
          'use client'
          import * as React from 'react'

          // Synchronously call a hook in a top-level Provider. With the
          // pre-fix optimizer behaviour, lazy discovery emits this module
          // at a different ?v= than the renderer's React, so React.H is
          // null when useMemo runs.
          export function TestProvider(props) {
            const value = React.useMemo(() => 'ready', [])
            return React.createElement(
              'span',
              { 'data-testid': 'use-client-hook-in-provider' },
              value,
            )
          }
        `,
        'src/client.tsx': /* tsx */ `
          'use client'
          export { TestProvider } from '@vitejs/test-dep-use-client-hook-in-provider'
        `,
        'src/root.tsx': /* tsx */ `
          import { TestProvider } from './client.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <TestProvider />
                </body>
              </html>
            )
          }
        `,
      },
    })
  })

  function defineUseClientHookTest(f: Fixture) {
    test('renders without Invalid hook call on cold start', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('use-client-hook-in-provider')).toHaveText(
        'ready',
      )
      expect(errors.join('\n')).not.toMatch(/Invalid hook call/)
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineUseClientHookTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineUseClientHookTest(f)
  })
})
