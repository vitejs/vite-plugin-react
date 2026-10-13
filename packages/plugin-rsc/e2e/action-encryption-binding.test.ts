import { expect, test, type Page } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/action-encryption-binding'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'src/root.tsx': /* tsx */ `
          import { BoundActions } from './bound-actions.tsx'

          // Two inline actions with same-shaped closures. \`preview\` captures a
          // request-derived value, \`readSecret\` a server-decided one (a toy
          // token check standing in for authentication).
          export function Root(props: { url: URL }) {
            const label = props.url.searchParams.get('label') ?? 'guest'
            const role =
              props.url.searchParams.get('token') === 'admin-token'
                ? 'admin'
                : 'viewer'

            async function preview() {
              'use server'
              return 'PREVIEW:' + label
            }

            async function readSecret() {
              'use server'
              return role === 'admin' ? 'BOUND_ARGS_SECRET' : 'DENIED:' + role
            }

            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <BoundActions preview={preview} readSecret={readSecret} />
                </body>
              </html>
            )
          }
        `,
        'src/bound-actions.tsx': /* tsx */ `
          'use client'
          import React from 'react'

          export function BoundActions(props: {
            preview: () => Promise<string>
            readSecret: () => Promise<string>
          }) {
            const [result, setResult] = React.useState('')
            return (
              <div>
                <button onClick={async () => setResult(await props.preview())}>
                  preview
                </button>
                <button onClick={async () => setResult(await props.readSecret())}>
                  read secret
                </button>
                <span data-testid="result">{result}</span>
              </div>
            )
          }
        `,
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineBindingTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineBindingTest(f)
  })

  function defineBindingTest(f: Fixture) {
    test('closures only decrypt for their own action', async ({ page }) => {
      using _ = expectNoPageError(page)
      // A viewer without the token controls `label` through the URL, so
      // `preview`'s encrypted closure carries an attacker-chosen value ("admin").
      await page.goto(f.url('/?label=admin'))
      await waitForHydration(page)

      // Call both actions from the UI and record each request, including its
      // encrypted closure in the body.
      const preview = await captureAction(page, {
        button: 'preview',
        result: 'PREVIEW:admin',
      })
      const readSecret = await captureAction(page, {
        button: 'read secret',
        result: 'DENIED:viewer',
      })
      expect(preview.id).not.toBe(readSecret.id)

      // Replay a recorded request body against `readSecret`'s action id.
      const callReadSecret = (request: { contentType: string; body: string }) =>
        page.request.post(f.url('/_.rsc'), {
          headers: {
            'content-type': request.contentType,
            'x-rsc-action': readSecret.id,
          },
          data: request.body,
        })

      // `readSecret`'s own closure still works, and its `role` capture is "viewer".
      const own = await callReadSecret(readSecret)
      expect(own.status()).toBe(200)
      expect(await own.text()).toContain('DENIED:viewer')

      // Attack: send `preview`'s closure as `readSecret`'s. Without binding, it
      // would decrypt as `readSecret`'s captures, making `role` "admin" and
      // returning the secret. Bound to `preview`'s id, it fails to decrypt.
      const swapped = await callReadSecret(preview)
      expect(swapped.status()).toBe(500)
      expect(await swapped.text()).not.toContain('BOUND_ARGS_SECRET')

      // Control: with the token, the same action returns the secret through the
      // UI, so the rejection above isn't hiding an unreachable branch.
      await page.goto(f.url('/?token=admin-token'))
      await waitForHydration(page)
      const adminReadSecret = await captureAction(page, {
        button: 'read secret',
        result: 'BOUND_ARGS_SECRET',
      })

      // Known limitation: the binding is per action definition, not per render
      // or user. The admin's render has the same action id, and its closure
      // still replays later, e.g. after the token is revoked or from another
      // user. Actions must re-check authorization instead of trusting captures.
      expect(adminReadSecret.id).toBe(readSecret.id)
      const replayed = await callReadSecret(adminReadSecret)
      expect(replayed.status()).toBe(200)
      expect(await replayed.text()).toContain('BOUND_ARGS_SECRET')
    })
  }
})

async function captureAction(
  page: Page,
  { button, result }: { button: string; result: string },
) {
  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && !!request.headers()['x-rsc-action'],
  )
  await page.getByRole('button', { name: button }).click()
  const request = await requestPromise
  await expect(page.getByTestId('result')).toHaveText(result)
  const headers = await request.allHeaders()
  return {
    id: headers['x-rsc-action']!,
    contentType: headers['content-type']!,
    body: request.postData() ?? '',
  }
}
