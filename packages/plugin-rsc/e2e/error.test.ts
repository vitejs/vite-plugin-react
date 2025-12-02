import { test, expect } from '@playwright/test'
import { x } from 'tinyexec'
import { setupInlineFixture } from './fixture'

test.describe('invalid directives', () => {
  test.describe('"use server" in "use client"', () => {
    const root = 'examples/e2e/temp/use-server-in-use-client'
    test.beforeAll(async () => {
      await setupInlineFixture({
        src: 'examples/starter',
        dest: root,
        files: {
          'src/client.tsx': /* tsx */ `
            "use client";
            
            export function TestClient() {
              return <div>[test-client]</div>
            }

            function testFn() {
              "use server";
              console.log("testFn");
            }
          `,
          'src/root.tsx': /* tsx */ `
            import { TestClient } from './client.tsx'
  
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
      expect(result.stderr).toContain(
        `'use server' directive is not allowed inside 'use client'`,
      )
      expect(result.exitCode).not.toBe(0)
    })
  })
})
