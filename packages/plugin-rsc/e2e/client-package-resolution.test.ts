import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/client-package-resolution'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'package.json': {
          edit: (source) => {
            const packageJson = JSON.parse(source)
            packageJson.dependencies = {
              ...packageJson.dependencies,
              '@vitejs/test-dep-root-conflict': '1.0.0',
              '@vitejs/test-dep-server-with-root-conflict': '1.0.0',
            }
            return JSON.stringify(packageJson, null, 2) + '\n'
          },
        },
        'src/root.tsx': /* tsx */ `
          import { TestServer } from '@vitejs/test-dep-server-with-root-conflict/server'

          export function Root() {
            return (
              <html lang="en">
                <body>
                  <TestServer />
                </body>
              </html>
            )
          }
        `,
        'node_modules/@vitejs/test-dep-root-conflict/package.json': /* json */ `
          {
            "name": "@vitejs/test-dep-root-conflict",
            "version": "1.0.0",
            "type": "module",
            "exports": {
              ".": "./index.js"
            }
          }
        `,
        'node_modules/@vitejs/test-dep-root-conflict/index.js': /* js */ `
          export const root = true
        `,
        'node_modules/@vitejs/test-dep-server-with-root-conflict/package.json': /* json */ `
          {
            "name": "@vitejs/test-dep-server-with-root-conflict",
            "version": "1.0.0",
            "type": "module",
            "exports": {
              "./server": "./server.js"
            },
            "dependencies": {
              "@vitejs/test-dep-root-conflict": "2.0.0"
            },
            "peerDependencies": {
              "react": "*"
            }
          }
        `,
        'node_modules/@vitejs/test-dep-server-with-root-conflict/server.js': /* js */ `
          import { TestClient } from '@vitejs/test-dep-root-conflict/client'
          import React from 'react'

          export function TestServer() {
            return React.createElement(TestClient)
          }
        `,
        'node_modules/@vitejs/test-dep-server-with-root-conflict/node_modules/@vitejs/test-dep-root-conflict/package.json': /* json */ `
          {
            "name": "@vitejs/test-dep-root-conflict",
            "version": "2.0.0",
            "type": "module",
            "exports": {
              "./client": "./client.js"
            },
            "peerDependencies": {
              "react": "*"
            }
          }
        `,
        'node_modules/@vitejs/test-dep-server-with-root-conflict/node_modules/@vitejs/test-dep-root-conflict/client.js': /* js */ `
          'use client'

          import React from 'react'

          export function TestClient() {
            const [count, setCount] = React.useState(0)
            return React.createElement(
              'button',
              { onClick: () => setCount((value) => value + 1) },
              'Nested client: ' + count,
            )
          }
        `,
      },
    })
  })

  for (const mode of ['dev', 'build'] as const) {
    test.describe(mode, () => {
      const f = useFixture({ root, mode })

      test('uses the client package resolved from its importer', async ({
        page,
      }) => {
        await page.goto(f.url())
        await waitForHydration(page)
        await page.getByRole('button', { name: 'Nested client: 0' }).click()
        await expect(
          page.getByRole('button', { name: 'Nested client: 1' }),
        ).toBeVisible()
      })
    })
  }
})
