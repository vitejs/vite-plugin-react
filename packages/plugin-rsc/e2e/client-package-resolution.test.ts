import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/client-package-resolution'

  test.beforeAll(async () => {
    // Dependency and import graph:
    //
    // app
    // |-- @vitejs/test-client-dep@1 (exports only its root)
    // `-- @vitejs/test-server-dep
    //     `-- @vitejs/test-client-dep@2 (exports "./client")
    //
    // root.tsx -> test-server-dep -> test-client-dep@2/client
    //                                ^ resolves from the actual importer
    //
    // The plugin also probes v2's "./client" specifier from the app root. That
    // finds v1 and throws because v1 does not export "./client", so the plugin
    // must keep the fully resolved nested v2 module ID instead.
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'package.json': {
          edit: (source) => {
            const packageJson = JSON.parse(source)
            packageJson.dependencies = {
              ...packageJson.dependencies,
              '@vitejs/test-client-dep': '1.0.0',
              '@vitejs/test-server-dep': '1.0.0',
            }
            return JSON.stringify(packageJson, null, 2) + '\n'
          },
        },
        'src/root.tsx': /* tsx */ `
          import { TestServer } from '@vitejs/test-server-dep/server'

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
        'node_modules/@vitejs/test-server-dep/package.json': json({
          name: '@vitejs/test-server-dep',
          version: '1.0.0',
          type: 'module',
          exports: {
            './server': './server.js',
          },
          dependencies: {
            '@vitejs/test-client-dep': '2.0.0',
          },
          peerDependencies: {
            react: '*',
          },
        }),
        'node_modules/@vitejs/test-server-dep/server.js': /* js */ `
          import { TestClient } from '@vitejs/test-client-dep/client'
          import React from 'react'

          export function TestServer() {
            return React.createElement(TestClient)
          }
        `,
        'node_modules/@vitejs/test-client-dep/package.json': json({
          name: '@vitejs/test-client-dep',
          version: '1.0.0',
          type: 'module',
          exports: './index.js',
        }),
        'node_modules/@vitejs/test-client-dep/index.js': /* js */ ``,
        'node_modules/@vitejs/test-server-dep/node_modules/@vitejs/test-client-dep/package.json':
          json({
            name: '@vitejs/test-client-dep',
            version: '2.0.0',
            type: 'module',
            exports: {
              './client': './client.js',
            },
            peerDependencies: {
              react: '*',
            },
          }),
        'node_modules/@vitejs/test-server-dep/node_modules/@vitejs/test-client-dep/client.js': /* js */ `
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
