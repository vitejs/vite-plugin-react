import { test, expect } from '@playwright/test'
import { x } from 'tinyexec'
import { setupInlineFixture, useFixture, type Fixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('validate imports', () => {
  test.describe('valid imports', () => {
    const root = 'examples/e2e/temp/validate-imports'
    test.beforeAll(async () => {
      await setupInlineFixture({
        src: 'examples/starter',
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
        src: 'examples/starter',
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
        src: 'examples/starter',
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
