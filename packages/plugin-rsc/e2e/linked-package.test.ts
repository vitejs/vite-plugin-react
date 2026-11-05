import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

// "isolated" installs each package's dependencies next to it, like pnpm.
// "hoisted" installs every dependency in the app's node_modules, like npm.
for (const layout of ['isolated', 'hoisted'] as const) {
  test.describe(layout, () => {
    defineLinkedPackageTests(layout)
  })
}

function defineLinkedPackageTests(layout: 'isolated' | 'hoisted') {
  const root = `examples/e2e/temp/linked-package-${layout}`
  // the node_modules that the dependencies of the package at `dir` go in
  const nodeModules = (dir: string) =>
    layout === 'hoisted' ? 'node_modules' : path.posix.join(dir, 'node_modules')

  test.beforeAll(async () => {
    // Dependency and import graph:
    //
    // app
    // `-- @vitejs/test-workspace-ui (linked, "react" in "dependencies")
    //     `-- @vitejs/test-client-lib ("react" in "peerDependencies")
    //
    // The client library is only reachable through the linked package. Builds
    // only externalize dependencies that resolve from the app, so without the
    // fix, the build fails in the hoisted layout but not in the isolated one.
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    const clientLibDir = `${nodeModules('packages/ui')}/@vitejs/test-client-lib`
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
            react: '*',
          },
        }),
        'packages/ui/server.js': /* js */ `
          import { TestClient } from '@vitejs/test-client-lib'
          import React from 'react'

          export function TestWorkspace() {
            return React.createElement(TestClient)
          }
        `,
        [`${clientLibDir}/package.json`]: json({
          name: '@vitejs/test-client-lib',
          version: '1.0.0',
          type: 'module',
          exports: './index.js',
          peerDependencies: {
            react: '*',
          },
        }),
        // the "use client" directive is on an internal module
        [`${clientLibDir}/index.js`]: /* js */ `
          export { TestClient } from './client.js'
        `,
        [`${clientLibDir}/client.js`]: /* js */ `
          'use client'

          import React from 'react'

          const CountContext = React.createContext(0)

          function Count() {
            return 'Workspace client: ' + React.useContext(CountContext)
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
      },
    })
    // link the workspace package like a package manager would
    const linkPath = path.resolve(
      root,
      `${nodeModules('.')}/@vitejs/test-workspace-ui`,
    )
    fs.mkdirSync(path.dirname(linkPath), { recursive: true })
    // a junction doesn't need extra privileges on Windows (ignored elsewhere)
    fs.symlinkSync(path.resolve(root, 'packages/ui'), linkPath, 'junction')
  })

  function defineTest(f: Fixture) {
    test('client library imported by a linked package', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      const button = (count: number) =>
        page.getByRole('button', {
          name: `Workspace client: ${count}`,
          exact: true,
        })
      await button(0).click()
      await expect(button(1)).toBeVisible()
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
}
