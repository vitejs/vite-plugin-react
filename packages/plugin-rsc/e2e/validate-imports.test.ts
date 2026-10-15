import { stripVTControlCharacters } from 'node:util'
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

// `client-only` / `server-only` are only invalid when the importing module
// survives tree-shaking. The packages below mirror the graph from
// https://github.com/cloudflare/vinext/issues/4007, where a server component
// imports one component from `@heroui/react`:
//
// @vitejs/test-barrel (sideEffects: false)
// |-- index.js
// |   |-- button.js       (server and client safe)
// |   |-- calendar.js     (imports "client-only")
// |   |-- server-data.js  (imports "server-only")
// |   `-- toast.js -> toast-queue.js -> @vitejs/test-primitives/toast
// `-- legacy.cjs          (requires "client-only")
//
// @vitejs/test-primitives (sideEffects: ["*.css"])
// `-- toast.js  imports "client-only" but only re-exports a binding of
//               queue.js, so rolldown drops the module even when the binding
//               is used (react-aria-components' `exports/Toast.mjs`). rollup
//               keeps the side-effect imports of modules on a re-export path,
//               so there the marker stays in the output.
test.describe('validate imports after tree-shaking', () => {
  function setupTreeShakingFixture(options: {
    root: string
    // `sideEffects` of @vitejs/test-barrel. omitted when undefined.
    sideEffects?: false
    files: Record<string, string>
  }) {
    const json = (value: unknown) => JSON.stringify(value, null, 2)
    return setupInlineFixture({
      src: 'examples/starter-extra',
      dest: options.root,
      files: {
        'package.json': {
          edit: (source) => {
            const packageJson = JSON.parse(source)
            packageJson.dependencies = {
              ...packageJson.dependencies,
              '@vitejs/test-barrel': '1.0.0',
              '@vitejs/test-primitives': '1.0.0',
            }
            return json(packageJson) + '\n'
          },
        },
        'node_modules/@vitejs/test-barrel/package.json': json({
          name: '@vitejs/test-barrel',
          version: '1.0.0',
          type: 'module',
          exports: {
            '.': './index.js',
            './toast': './toast.js',
            './legacy': './legacy.cjs',
          },
          ...(options.sideEffects === undefined
            ? {}
            : { sideEffects: options.sideEffects }),
          dependencies: { '@vitejs/test-primitives': '1.0.0' },
          peerDependencies: { react: '*' },
        }),
        'node_modules/@vitejs/test-barrel/index.js': /* js */ `
          export { Button } from './button.js'
          export { Calendar } from './calendar.js'
          export { getServerData } from './server-data.js'
          export { Toast } from './toast.js'
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
        'node_modules/@vitejs/test-barrel/server-data.js': /* js */ `
          import 'server-only'
          export function getServerData() {
            return '[test-server-data]'
          }
        `,
        'node_modules/@vitejs/test-barrel/toast.js': /* js */ `
          import React from 'react'
          import { toastQueue } from './toast-queue.js'
          function Provider() {
            return React.createElement('div', null, '[test-toast:' + toastQueue.items.length + ']')
          }
          export const Toast = { Provider }
        `,
        'node_modules/@vitejs/test-barrel/toast-queue.js': /* js */ `
          import { Queue } from '@vitejs/test-primitives/toast'
          export const toastQueue = new Queue()
        `,
        'node_modules/@vitejs/test-barrel/legacy.cjs': /* js */ `
          require('client-only')
          exports.legacyLabel = '[test-legacy]'
        `,
        'node_modules/@vitejs/test-primitives/package.json': json({
          name: '@vitejs/test-primitives',
          version: '1.0.0',
          type: 'module',
          exports: { './toast': './toast.js' },
          sideEffects: ['*.css'],
          peerDependencies: { react: '*' },
        }),
        'node_modules/@vitejs/test-primitives/queue.js': /* js */ `
          export class Queue {
            constructor() {
              this.items = []
            }
          }
        `,
        'node_modules/@vitejs/test-primitives/toast.js': /* js */ `
          import { Queue as ToastQueue } from './queue.js'
          import 'client-only'
          export { ToastQueue as Queue }
        `,
        ...options.files,
      },
    })
  }

  function rootSource(options: { imports: string; body: string }) {
    return /* tsx */ `
      ${options.imports}

      export async function Root() {
        return (
          <html lang="en">
            <head>
              <meta charSet="UTF-8" />
            </head>
            <body>
              ${options.body}
            </body>
          </html>
        )
      }
    `
  }

  async function build(root: string) {
    const result = await x('pnpm', ['build'], {
      throwOnError: false,
      nodeOptions: { cwd: root },
    })
    return {
      exitCode: result.exitCode,
      stderr: stripVTControlCharacters(result.stderr),
    }
  }

  test.describe('client-only in an unused barrel leaf', () => {
    const root = 'examples/e2e/temp/validate-client-only-tree-shaking'
    test.beforeAll(async () => {
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { Button } from '@vitejs/test-barrel'`,
            body: `<Button>[test-server-button]</Button>`,
          }),
        },
      })
    })

    const f = useFixture({ root, mode: 'build' })

    test('build', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByRole('button')).toHaveText('[test-server-button]')
    })
  })

  test.describe('client-only in a module that only re-exports a used binding', () => {
    // rollup keeps the marker, see "client-only kept by a re-export on rollup"
    test.skip(!('rolldownVersion' in vite), 'rolldown only')

    const root = 'examples/e2e/temp/validate-client-only-tree-shaking-reexport'
    test.beforeAll(async () => {
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          // bypass the barrel so that the re-export is the only marker import
          'src/root.tsx': rootSource({
            imports: `import { Toast } from '@vitejs/test-barrel/toast'`,
            body: `<Toast.Provider />`,
          }),
        },
      })
    })

    const f = useFixture({ root, mode: 'build' })

    test('build', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByText('[test-toast:0]')).toBeVisible()
    })
  })

  test.describe('server-only in an unused barrel leaf', () => {
    const root = 'examples/e2e/temp/validate-server-only-tree-shaking'
    test.beforeAll(async () => {
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            import React from 'react'
            import { Button } from '@vitejs/test-barrel'

            export function TestClient() {
              const [count, setCount] = React.useState(0)
              return (
                <div onClick={() => setCount(count + 1)}>
                  <Button>[test-client-button:{count}]</Button>
                </div>
              )
            }
          `,
          'src/root.tsx': rootSource({
            imports: `import { TestClient } from './client.tsx'`,
            body: `<TestClient />`,
          }),
        },
      })
    })

    const f = useFixture({ root, mode: 'build' })

    test('build', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
      const button = page.getByRole('button')
      await expect(button).toHaveText('[test-client-button:0]')
      await button.click()
      await expect(button).toHaveText('[test-client-button:1]')
    })
  })

  test.describe('invalid imports kept by tree-shaking', () => {
    test('client-only in a used barrel leaf', async () => {
      const root = 'examples/e2e/temp/validate-client-only-used-leaf'
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { Calendar } from '@vitejs/test-barrel'`,
            body: `<Calendar />`,
          }),
        },
      })
      const result = await build(root)
      expect(result.stderr).toContain(`rsc:validate-imports`)
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build ('rsc' environment):\n` +
          ` imported by node_modules/@vitejs/test-barrel/calendar.js\n` +
          `  imported by node_modules/@vitejs/test-barrel/index.js\n` +
          `   imported by src/root.tsx\n`,
      )
      expect(result.exitCode).not.toBe(0)
    })

    test('client-only in a package without sideEffects: false', async () => {
      const root = 'examples/e2e/temp/validate-client-only-side-effects'
      await setupTreeShakingFixture({
        root,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { Button } from '@vitejs/test-barrel'`,
            body: `<Button>[test-server-button]</Button>`,
          }),
        },
      })
      const result = await build(root)
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build ('rsc' environment):\n` +
          ` imported by node_modules/@vitejs/test-barrel/calendar.js\n`,
      )
      expect(result.exitCode).not.toBe(0)
    })

    test('client-only required by a used CommonJS module', async () => {
      const root = 'examples/e2e/temp/validate-client-only-require'
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { legacyLabel } from '@vitejs/test-barrel/legacy'`,
            body: `<div>{legacyLabel}</div>`,
          }),
        },
      })
      const result = await build(root)
      // rollup's commonjs plugin adds proxy modules to the chain
      expect(result.stderr).toMatch(
        /'client-only' cannot be imported in server build \('rsc' environment\):\n(?: +imported by .*\n)*? +imported by node_modules\/@vitejs\/test-barrel\/legacy\.cjs\n(?: +imported by .*\n)*? +imported by src\/root\.tsx\n/,
      )
      expect(result.exitCode).not.toBe(0)
    })

    test('client-only kept by a re-export on rollup', async () => {
      test.skip('rolldownVersion' in vite, 'rollup only')
      const root = 'examples/e2e/temp/validate-client-only-reexport-rollup'
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { Button, Toast } from '@vitejs/test-barrel'`,
            body: `<Button>[test-server-button]</Button><Toast.Provider />`,
          }),
        },
      })
      const result = await build(root)
      // the chain names the re-export that kept the marker rather than the
      // dropped `calendar.js`, which also imports `client-only`
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build ('rsc' environment):\n` +
          ` imported by node_modules/@vitejs/test-primitives/toast.js\n` +
          `  imported by node_modules/@vitejs/test-barrel/toast-queue.js\n` +
          `   imported by node_modules/@vitejs/test-barrel/toast.js\n`,
      )
      expect(result.exitCode).not.toBe(0)
    })

    test('client-only dynamically imported next to a dropped barrel leaf', async () => {
      const root = 'examples/e2e/temp/validate-client-only-dynamic-import'
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/root.tsx': rootSource({
            imports: `import { Button } from '@vitejs/test-barrel'`,
            body: `{await import('client-only').then(() => null)}<Button>[test-server-button]</Button>`,
          }),
        },
      })
      const result = await build(root)
      // the chain names the import that is kept rather than the dropped
      // `calendar.js`, which also imports `client-only`
      expect(result.stderr).toContain(
        `'client-only' cannot be imported in server build ('rsc' environment):\n` +
          ` imported by src/root.tsx\n`,
      )
      expect(result.exitCode).not.toBe(0)
    })

    test('server-only in a used barrel leaf', async () => {
      const root = 'examples/e2e/temp/validate-server-only-used-leaf'
      await setupTreeShakingFixture({
        root,
        sideEffects: false,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            import { getServerData } from '@vitejs/test-barrel'

            export function TestClient() {
              return <div>{getServerData()}</div>
            }
          `,
          'src/root.tsx': rootSource({
            imports: `import { TestClient } from './client.tsx'`,
            body: `<TestClient />`,
          }),
        },
      })
      const result = await build(root)
      expect(result.stderr).toContain(`rsc:validate-imports`)
      expect(result.stderr).toMatch(
        /'server-only' cannot be imported in client build \('(client|ssr)' environment\):\n imported by node_modules\/@vitejs\/test-barrel\/server-data\.js\n  imported by node_modules\/@vitejs\/test-barrel\/index\.js\n   imported by src\/client\.tsx\n/,
      )
      expect(result.exitCode).not.toBe(0)
    })
  })
})
