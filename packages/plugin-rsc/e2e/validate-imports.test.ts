import { test, expect } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { x } from 'tinyexec'

test.describe('validate imports', () => {
  test('should fail build when server-only is imported in client component', async () => {
    const root = 'examples/e2e/temp/validate-imports-server-only-client'

    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'package.json': {
          edit: (content) => {
            const pkg = JSON.parse(content)
            pkg.dependencies = {
              ...pkg.dependencies,
              'server-only': '^0.0.1',
            }
            return JSON.stringify(pkg, null, 2)
          },
        },
        'src/client.tsx': /* tsx */ `
          "use client";
          import 'server-only';
          
          export function ClientComponent() {
            return <div>This should fail</div>
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { ClientComponent } from './client.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <ClientComponent />
                </body>
              </html>
            )
          }
        `,
      },
    })

    // Install dependencies including server-only
    await x('pnpm', ['i'], {
      throwOnError: true,
      nodeOptions: {
        cwd: root,
        stdio: 'ignore',
      },
    })

    // Expect build to fail
    const result = await x('pnpm', ['build'], {
      throwOnError: false,
      nodeOptions: {
        cwd: root,
        stdio: 'pipe',
      },
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("'server-only' is included in client build")
  })

  test('should fail build when client-only is imported in server component', async () => {
    const root = 'examples/e2e/temp/validate-imports-client-only-server'

    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'package.json': {
          edit: (content) => {
            const pkg = JSON.parse(content)
            pkg.dependencies = {
              ...pkg.dependencies,
              'client-only': '^0.0.1',
            }
            return JSON.stringify(pkg, null, 2)
          },
        },
        'src/server.tsx': /* tsx */ `
          import 'client-only';
          
          export function ServerComponent() {
            return <div>This should fail</div>
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { ServerComponent } from './server.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <ServerComponent />
                </body>
              </html>
            )
          }
        `,
      },
    })

    // Install dependencies including client-only
    await x('pnpm', ['i'], {
      throwOnError: true,
      nodeOptions: {
        cwd: root,
        stdio: 'ignore',
      },
    })

    // Expect build to fail
    const result = await x('pnpm', ['build'], {
      throwOnError: false,
      nodeOptions: {
        cwd: root,
        stdio: 'pipe',
      },
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("'client-only' is included in server build")
  })

  test('should allow valid imports when validation is enabled', async () => {
    const root = 'examples/e2e/temp/validate-imports-valid'

    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'package.json': {
          edit: (content) => {
            const pkg = JSON.parse(content)
            pkg.dependencies = {
              ...pkg.dependencies,
              'server-only': '^0.0.1',
              'client-only': '^0.0.1',
            }
            return JSON.stringify(pkg, null, 2)
          },
        },
        'src/client.tsx': /* tsx */ `
          "use client";
          import 'client-only';
          
          export function ClientComponent() {
            return <div>Valid client import</div>
          }
        `,
        'src/server.tsx': /* tsx */ `
          import 'server-only';
          
          export function ServerComponent() {
            return <div>Valid server import</div>
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { ClientComponent } from './client.tsx'
          import { ServerComponent } from './server.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <ServerComponent />
                  <ClientComponent />
                </body>
              </html>
            )
          }
        `,
      },
    })

    // Install dependencies
    await x('pnpm', ['i'], {
      throwOnError: true,
      nodeOptions: {
        cwd: root,
        stdio: 'ignore',
      },
    })

    // Expect build to succeed
    const result = await x('pnpm', ['build'], {
      throwOnError: false,
      nodeOptions: {
        cwd: root,
        stdio: 'pipe',
      },
    })

    expect(result.exitCode).toBe(0)
  })

  test('should allow invalid imports when validation is disabled', async () => {
    const root = 'examples/e2e/temp/validate-imports-disabled'

    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'package.json': {
          edit: (content) => {
            const pkg = JSON.parse(content)
            pkg.dependencies = {
              ...pkg.dependencies,
              'server-only': '^0.0.1',
            }
            return JSON.stringify(pkg, null, 2)
          },
        },
        'vite.config.ts': /* ts */ `
          import rsc from '@vitejs/plugin-rsc'
          import react from '@vitejs/plugin-react'
          
          export default {
            plugins: [
              react(),
              rsc({
                validateImports: false, // Disable validation
              }),
            ],
          }
        `,
        'src/client.tsx': /* tsx */ `
          "use client";
          import 'server-only';
          
          export function ClientComponent() {
            return <div>Invalid but allowed</div>
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { ClientComponent } from './client.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <ClientComponent />
                </body>
              </html>
            )
          }
        `,
      },
    })

    // Install dependencies
    await x('pnpm', ['i'], {
      throwOnError: true,
      nodeOptions: {
        cwd: root,
        stdio: 'ignore',
      },
    })

    // Expect build to succeed even with invalid import because validation is disabled
    const result = await x('pnpm', ['build'], {
      throwOnError: false,
      nodeOptions: {
        cwd: root,
        stdio: 'pipe',
      },
    })

    expect(result.exitCode).toBe(0)
  })
})
