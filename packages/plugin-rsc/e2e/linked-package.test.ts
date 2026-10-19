import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
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
    //     |-- @vitejs/test-client-lib ("react" in "peerDependencies")
    //     `-- @vitejs/test-workspace-nested (linked, "react" in "dependencies")
    //         `-- @vitejs/test-nested-client-lib ("react" in "peerDependencies")
    //
    // Linked packages resolve outside node_modules, so Vite treats them as
    // source. The client libraries are only reachable through the linked
    // packages, and their "use client" directive sits on an internal module.
    // Unless they're in "noExternal" and excluded from the server optimizers,
    // dev externalizes them, or pre-bundles them and drops the directive when
    // dependency discovery is enabled. Builds only externalize dependencies
    // that resolve from the app, so they fail in the hoisted layout.
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    // a React library whose "use client" directive is on an internal module
    const clientLibrary = (parent: string, name: string, label: string) => {
      const dir = `${nodeModules(parent)}/${name}`
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
        ...clientLibrary(
          'packages/ui',
          '@vitejs/test-client-lib',
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
        ...clientLibrary(
          'packages/nested',
          '@vitejs/test-nested-client-lib',
          'Nested workspace client',
        ),
      },
    })
    // link workspace packages like a package manager would
    const link = (target: string, linkPath: string) => {
      const absoluteLinkPath = path.resolve(root, linkPath)
      fs.mkdirSync(path.dirname(absoluteLinkPath), { recursive: true })
      // a junction doesn't need extra privileges on Windows (ignored elsewhere)
      fs.symlinkSync(path.resolve(root, target), absoluteLinkPath, 'junction')
    }
    link('packages/ui', `${nodeModules('.')}/@vitejs/test-workspace-ui`)
    link(
      'packages/nested',
      `${nodeModules('packages/ui')}/@vitejs/test-workspace-nested`,
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
}
