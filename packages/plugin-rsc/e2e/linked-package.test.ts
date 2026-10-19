import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/linked-package'

  test.beforeAll(async () => {
    // Dependency and import graph:
    //
    // app
    // `-- @vitejs/test-workspace-ui (linked, "react" in "dependencies")
    //     |-- @vitejs/test-client-lib ("react" in "peerDependencies")
    //     `-- @vitejs/test-workspace-nested (linked, "react" in "dependencies")
    //         `-- @vitejs/test-nested-client-lib ("react" in "peerDependencies")
    //
    // Linked packages resolve outside node_modules, so Vite treats them as
    // source and discovers their bare imports for pre-bundling. The client
    // libraries are only reachable through the linked packages, and their
    // "use client" directive sits on an internal module that pre-bundling
    // would drop, so they must be excluded from the server optimizers.
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    const clientLib = (name: string, label: string) => ({
      [`${name}/package.json`]: json({
        name: name.split('node_modules/')[1],
        version: '1.0.0',
        type: 'module',
        exports: './index.js',
        peerDependencies: {
          react: '*',
        },
      }),
      [`${name}/index.js`]: /* js */ `
        export { TestClient } from './client.js'
      `,
      [`${name}/client.js`]: /* js */ `
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
    })
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
            '@vitejs/test-client-lib': '1.0.0',
            '@vitejs/test-workspace-nested': '0.0.0',
            react: '*',
          },
        }),
        'packages/ui/server.js': /* js */ `
          import { TestClient } from '@vitejs/test-client-lib'
          import { TestNested } from '@vitejs/test-workspace-nested/server'
          import React from 'react'

          export function TestWorkspace() {
            return React.createElement(
              'div',
              null,
              React.createElement(TestClient),
              React.createElement(TestNested),
            )
          }
        `,
        ...clientLib(
          'packages/ui/node_modules/@vitejs/test-client-lib',
          'Workspace client',
        ),
        'packages/nested/package.json': json({
          name: '@vitejs/test-workspace-nested',
          version: '0.0.0',
          private: true,
          type: 'module',
          exports: {
            './server': './server.js',
          },
          dependencies: {
            '@vitejs/test-nested-client-lib': '1.0.0',
            react: '*',
          },
        }),
        'packages/nested/server.js': /* js */ `
          import { TestClient } from '@vitejs/test-nested-client-lib'
          import React from 'react'

          export function TestNested() {
            return React.createElement(TestClient)
          }
        `,
        ...clientLib(
          'packages/nested/node_modules/@vitejs/test-nested-client-lib',
          'Nested workspace client',
        ),
      },
    })
    // link workspace packages like a package manager would
    const link = (target: string, linkPath: string) => {
      const absoluteLinkPath = path.join(root, linkPath)
      fs.mkdirSync(path.dirname(absoluteLinkPath), { recursive: true })
      fs.symlinkSync(
        path.relative(path.dirname(absoluteLinkPath), path.join(root, target)),
        absoluteLinkPath,
        'dir',
      )
    }
    link('packages/ui', 'node_modules/@vitejs/test-workspace-ui')
    link(
      'packages/nested',
      'packages/ui/node_modules/@vitejs/test-workspace-nested',
    )
  })

  function defineTest(f: ReturnType<typeof useFixture>) {
    test('client libraries imported by linked packages', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await page
        .getByRole('button', { name: 'Workspace client: 0', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Workspace client: 1', exact: true }),
      ).toBeVisible()
      await page
        .getByRole('button', {
          name: 'Nested workspace client: 0',
          exact: true,
        })
        .click()
      await expect(
        page.getByRole('button', {
          name: 'Nested workspace client: 1',
          exact: true,
        }),
      ).toBeVisible()
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
