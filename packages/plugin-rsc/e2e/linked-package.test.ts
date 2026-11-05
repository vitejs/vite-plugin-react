import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/linked-package'

  test.beforeAll(async () => {
    // Dependency and import graph:
    //
    // app
    // `-- @vitejs/test-workspace-ui (linked, "react" in "dependencies")
    //     |-- @vitejs/test-client-lib-hoisted ("react" in "peerDependencies")
    //     `-- @vitejs/test-client-lib-isolated ("react" in "peerDependencies")
    //
    // The client libraries are only reachable through the linked package, and
    // their "use client" directive is on an internal module. The hoisted one
    // is in the app's node_modules, like npm installs it. The isolated one is
    // in the linked package's node_modules, like pnpm installs it.
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    // a React library installed in `nodeModules`
    const clientLibrary = ({
      nodeModules,
      name,
      label,
    }: {
      nodeModules: string
      name: string
      label: string
    }) => {
      const dir = `${nodeModules}/${name}`
      return {
        [`${dir}/package.json`]: json({
          name,
          version: '1.0.0',
          type: 'module',
          exports: './index.js',
          peerDependencies: {
            react: '*',
          },
        }),
        [`${dir}/index.js`]: /* js */ `
        export { TestClient } from './client.js'
      `,
        [`${dir}/client.js`]: /* js */ `
        'use client'

        import React from 'react'

        const CountContext = React.createContext(0)

        function Count() {
          return ${JSON.stringify(label + ': ')} + React.useContext(CountContext)
        }

        export function TestClient() {
          const [count, setCount] = React.useState(0)
          return React.createElement(
            CountContext.Provider,
            { value: count },
            React.createElement(
              'button',
              { onClick: () => setCount((value) => value + 1) },
              React.createElement(Count),
            ),
          )
        }
      `,
      }
    }
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'package.json': {
          edit: (source) => {
            const packageJson = JSON.parse(source)
            packageJson.dependencies = {
              ...packageJson.dependencies,
              '@vitejs/test-workspace-ui': '0.0.0',
            }
            return JSON.stringify(packageJson, null, 2) + '\n'
          },
        },
        'src/root.tsx': /* tsx */ `
          import { TestWorkspace } from '@vitejs/test-workspace-ui/server'

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
          name: '@vitejs/test-workspace-ui',
          version: '0.0.0',
          private: true,
          type: 'module',
          exports: {
            './server': './server.js',
          },
          dependencies: {
            '@vitejs/test-client-lib-hoisted': '1.0.0',
            '@vitejs/test-client-lib-isolated': '1.0.0',
            react: '*',
          },
        }),
        'packages/ui/server.js': /* js */ `
          import { TestClient as TestHoisted } from '@vitejs/test-client-lib-hoisted'
          import { TestClient as TestIsolated } from '@vitejs/test-client-lib-isolated'
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
        ...clientLibrary({
          nodeModules: 'node_modules',
          name: '@vitejs/test-client-lib-hoisted',
          label: 'Hoisted client',
        }),
        ...clientLibrary({
          nodeModules: 'packages/ui/node_modules',
          name: '@vitejs/test-client-lib-isolated',
          label: 'Isolated client',
        }),
      },
    })
    // link the workspace package like a package manager would
    const linkPath = path.resolve(
      root,
      'node_modules/@vitejs/test-workspace-ui',
    )
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
