import { test, expect } from '@playwright/test'
import { x } from 'tinyexec'
import * as vite from 'vite'
import { setupInlineFixture, useFixture, type Fixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('validate imports', () => {
  test.describe('valid imports', () => {
    const root = 'examples/e2e/temp/validate-imports'
    test.beforeAll(async () => {
      await setupInlineFixture({
        src: 'examples/starter-extra',
        dest: root,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            import 'client-only';
            
            export function TestClient() {
              return <div>[test-client]</div>
            }
          `,
          'src/root.tsx': /* tsx */ `
            import { TestClient } from './client.tsx'
            import 'server-only';
  
            export function Root() {
              return (
                <html lang="en">
                  <head>
                    <meta charSet="UTF-8" />
                  </head>
                  <body>
                    <div>[test-server]</div>
                    <TestClient />
                  </body>
                </html>
              )
            }
          `,
        },
      })
    })

    test.describe('dev', () => {
      const f = useFixture({ root, mode: 'dev' })
      defineTest(f)
    })

    test.describe('build', () => {
      const f = useFixture({ root, mode: 'build' })
      defineTest(f)
    })

    function defineTest(f: Fixture) {
      test('basic', async ({ page }) => {
        using _ = expectNoPageError(page)
        await page.goto(f.url())
        await waitForHydration(page)
      })
    }
  })

  test.describe('server-only on client', () => {
    const root = 'examples/e2e/temp/validate-server-only'
    test.beforeAll(async () => {
      await setupInlineFixture({
        src: 'examples/starter-extra',
        dest: root,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            import 'server-only';
            
            export function TestClient() {
              return <div>[test-client]</div>
            }
          `,
          'src/root.tsx': /* tsx */ `
            import { TestClient } from './client.tsx'
            import 'server-only';
  
            export function Root() {
              return (
                <html lang="en">
                  <head>
                    <meta charSet="UTF-8" />
                  </head>
                  <body>
                    <div>[test-server]</div>
                    <TestClient />
                  </body>
                </html>
              )
            }
          `,
        },
      })
    })

    test('build', async () => {
      const result = await x('pnpm', ['build'], {
        throwOnError: false,
        nodeOptions: { cwd: root },
      })
      // assertion is adjusted for rolldown-vite
      expect(result.stderr).toContain(`rsc:validate-imports`)
      expect(result.stderr).toContain(
        `'server-only' cannot be imported in client build`,
      )
      expect(result.exitCode).not.toBe(0)
    })
  })

  test.describe('client-only on server', () => {
    const root = 'examples/e2e/temp/validate-client-only'
    test.beforeAll(async () => {
      await setupInlineFixture({
        src: 'examples/starter-extra',
        dest: root,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            import 'client-only';
            
            export function TestClient() {
              return <div>[test-client]</div>
            }
          `,
          'src/root.tsx': /* tsx */ `
            import { TestClient } from './client.tsx'
            import 'client-only';
  
            export function Root() {
              return (
                <html lang="en">
                  <head>
                    <meta charSet="UTF-8" />
                  </head>
                  <body>
                    <div>[test-server]</div>
                    <TestClient />
                  </body>
                </html>
              )
            }
          `,
        },
      })
    })

    test('build', async () => {
      const result = await x('pnpm', ['build'], {
        throwOnError: false,
        nodeOptions: { cwd: root },
      })
      expect(result.stderr).toContain(`rsc:validate-imports`)
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build`,
      )
      expect(result.exitCode).not.toBe(0)
    })
  })
})

// A server component importing one export from a `sideEffects: false` barrel
// package still pulls in every leaf the barrel re-exports, including one that
// imports `client-only`. Rewriting barrel imports to subpath imports with
// `@rolldown/plugin-transform-imports` keeps unused leaves out of the module
// graph in both dev and build.
test.describe('client-only in barrel package', () => {
  function setupBarrelFixture(options: {
    root: string
    transformImports: boolean
  }) {
    return setupInlineFixture({
      src: 'examples/starter-extra',
      dest: options.root,
      files: {
        'package.json': {
          edit: (s) => {
            const pkg = JSON.parse(s)
            pkg.dependencies['@vitejs/test-barrel'] = '0.0.0'
            return JSON.stringify(pkg, null, 2)
          },
        },
        'node_modules/@vitejs/test-barrel/package.json': JSON.stringify({
          name: '@vitejs/test-barrel',
          version: '0.0.0',
          type: 'module',
          sideEffects: false,
          exports: {
            '.': './index.js',
            './button': './button.js',
            './calendar': './calendar.js',
          },
          peerDependencies: { react: '*' },
        }),
        'node_modules/@vitejs/test-barrel/index.js': /* js */ `
          export { Button } from './button.js'
          export { Calendar } from './calendar.js'
        `,
        'node_modules/@vitejs/test-barrel/button.js': /* js */ `
          import React from 'react'
          export function Button(props) {
            return React.createElement('button', null, props.children)
          }
        `,
        'node_modules/@vitejs/test-barrel/calendar.js': /* js */ `
          import 'client-only'
          import React from 'react'
          export function Calendar() {
            return React.createElement('div', null, '[test-calendar]')
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { Button } from '@vitejs/test-barrel'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <Button>[test-barrel-button]</Button>
                </body>
              </html>
            )
          }
        `,
        ...(options.transformImports && {
          'vite.config.ts': {
            edit: (s) =>
              s
                .replace(
                  `import { defineConfig } from 'vite'`,
                  `import { defineConfig } from 'vite'\nimport transformImports from '@rolldown/plugin-transform-imports'`,
                )
                .replace(
                  `plugins: [`,
                  `plugins: [
    transformImports({
      '@vitejs/test-barrel': {
        transform: [
          ['[A-Z].*', '@vitejs/test-barrel/{{kebabCase member}}'],
          ['*', '@vitejs/test-barrel'],
        ],
        skipDefaultConversion: true,
      },
    }),
    `,
                ),
          },
        }),
      },
    })
  }

  test.describe('without transform', () => {
    const root = 'examples/e2e/temp/validate-client-only-barrel'
    test.beforeAll(async () => {
      await setupBarrelFixture({ root, transformImports: false })
    })

    test.describe('dev', () => {
      const f = useFixture({ root, mode: 'dev' })

      test('basic', async ({ request }) => {
        const res = await request.get(f.url())
        expect(res.status()).toBe(500)
        expect(await res.text()).toContain(
          `'client-only' cannot be imported in server build`,
        )
      })
    })

    test('build', async () => {
      const result = await x('pnpm', ['build'], {
        throwOnError: false,
        nodeOptions: { cwd: root },
      })
      expect(result.stderr).toContain(`rsc:validate-imports`)
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build`,
      )
      expect(result.exitCode).not.toBe(0)
    })
  })

  test.describe('with transform', () => {
    test.skip(!('rolldownVersion' in vite), 'rolldown only')

    const root = 'examples/e2e/temp/validate-client-only-barrel-transform'
    test.beforeAll(async () => {
      await setupBarrelFixture({ root, transformImports: true })
    })

    test.describe('dev', () => {
      const f = useFixture({ root, mode: 'dev' })
      defineTest(f)
    })

    test.describe('build', () => {
      const f = useFixture({ root, mode: 'build' })
      defineTest(f)
    })

    function defineTest(f: Fixture) {
      test('basic', async ({ page }) => {
        using _ = expectNoPageError(page)
        await page.goto(f.url())
        await expect(page.getByRole('button')).toHaveText(
          '[test-barrel-button]',
        )
      })
    }
  })
})
