import { test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import {
  expectNoPageError,
  waitForHydration as waitForHydration_,
} from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/ssr-thenable'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/root.tsx': /* tsx */ `
          import { TestClientUse } from './client.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <TestClientUse />
                </body>
              </html>
            )
          }
        `,
        'src/client.tsx': /* tsx */ `
          "use client";
          import React from 'react'

          const promise = Promise.resolve('ok')

          export function TestClientUse() {
            const value = React.use(promise)
            return <span data-testid="client-use">{value}</span>
          }
        `,
      },
    })
  })

  function defineSsrThenableTest(f: Fixture) {
    test('ssr-thenable', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration_(page)
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineSsrThenableTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineSsrThenableTest(f)
  })
})
