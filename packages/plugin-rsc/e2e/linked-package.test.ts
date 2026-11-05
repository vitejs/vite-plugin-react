import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/linked-package'

  test.beforeAll(async () => {
    // Directory layout:
    //
    // node_modules/
    // |-- test-ui -> packages/ui (linked)
    // `-- test-client-hoisted (hoisted like npm)
    // packages/ui/ ("react" in "dependencies", imports both client libraries)
    // `-- node_modules/
    //     `-- test-client-isolated (isolated like pnpm)
    //
    // The client libraries list "react" in "peerDependencies", and their
    // "use client" directive is on an internal module.
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
              'test-ui': '0.0.0',
            }
            return JSON.stringify(packageJson, null, 2) + '\n'
          },
        },
        'src/root.tsx': /* tsx */ `
          import { TestWorkspace } from 'test-ui/server'

          export function Root() {
            return (
              <html lang="en">
                <body>
                  <TestWorkspace />
                </body>
              </html>
            )
          }
        `,
        'packages/ui/package.json': json({
          name: 'test-ui',
          version: '0.0.0',
          private: true,
          type: 'module',
          exports: {
            './server': './server.js',
          },
          dependencies: {
            'test-client-hoisted': '1.0.0',
            'test-client-isolated': '1.0.0',
            react: '*',
          },
        }),
        'packages/ui/server.js': /* js */ `
          import { TestHoisted } from 'test-client-hoisted'
          import { TestIsolated } from 'test-client-isolated'
          import React from 'react'

          export function TestWorkspace() {
            return React.createElement(
              'div',
              null,
              React.createElement(TestHoisted),
              React.createElement(TestIsolated),
            )
          }
        `,
        'node_modules/test-client-hoisted/package.json': json({
          name: 'test-client-hoisted',
          version: '1.0.0',
          type: 'module',
          exports: './index.js',
          peerDependencies: {
            react: '*',
          },
        }),
        'node_modules/test-client-hoisted/index.js': /* js */ `
          export { TestHoisted } from './client.js'
        `,
        'node_modules/test-client-hoisted/client.js': /* js */ `
          'use client'

          import React from 'react'

          export function TestHoisted() {
            const [count, setCount] = React.useState(0)
            return React.createElement(
              'button',
              { onClick: () => setCount((value) => value + 1) },
              'Hoisted client: ' + count,
            )
          }
        `,
        'packages/ui/node_modules/test-client-isolated/package.json': json({
          name: 'test-client-isolated',
          version: '1.0.0',
          type: 'module',
          exports: './index.js',
          peerDependencies: {
            react: '*',
          },
        }),
        'packages/ui/node_modules/test-client-isolated/index.js': /* js */ `
          export { TestIsolated } from './client.js'
        `,
        'packages/ui/node_modules/test-client-isolated/client.js': /* js */ `
          'use client'

          import React from 'react'

          export function TestIsolated() {
            const [count, setCount] = React.useState(0)
            return React.createElement(
              'button',
              { onClick: () => setCount((value) => value + 1) },
              'Isolated client: ' + count,
            )
          }
        `,
      },
    })
    // link the workspace package like a package manager would
    const linkPath = path.resolve(root, 'node_modules/test-ui')
    fs.mkdirSync(path.dirname(linkPath), { recursive: true })
    // a junction doesn't need extra privileges on Windows (ignored elsewhere)
    fs.symlinkSync(path.resolve(root, 'packages/ui'), linkPath, 'junction')
  })

  function defineTest(f: Fixture) {
    test('client libraries imported by a linked package', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      for (const label of ['Hoisted client', 'Isolated client']) {
        await page.getByRole('button', { name: `${label}: 0` }).click()
        await expect(
          page.getByRole('button', { name: `${label}: 1` }),
        ).toBeVisible()
      }
    })
  }

  for (const mode of ['dev', 'build'] as const) {
    test.describe(mode, () => {
      defineTest(useFixture({ root, mode }))
    })
  }

  // `@cloudflare/vite-plugin` enables dependency discovery in the `rsc` environment
  test.describe('dev-cloudflare', () => {
    defineTest(useFixture({ root, mode: 'dev', command: 'pnpm cf:dev' }))
  })

  test.describe('build-cloudflare', () => {
    defineTest(
      useFixture({
        root,
        mode: 'build',
        buildCommand: 'pnpm cf:build',
        command: 'pnpm cf:preview',
      }),
    )
  })
})
