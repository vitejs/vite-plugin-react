import { expect, test, type Page } from '@playwright/test'
import { encryptBuffer, fromBase64 } from '../src/utils/encryption-utils'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

// A fixed key lets the test seal closures the way an older or tampered
// encryption would.
const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

test.describe(() => {
  const root = 'examples/e2e/temp/action-encryption-binding'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (s) =>
            s.replace(
              'rsc()',
              `rsc({ defineEncryptionKey: ${JSON.stringify(
                JSON.stringify(ENCRYPTION_KEY),
              )} })`,
            ),
        },
        'src/root.tsx': /* tsx */ `
          import { BoundActions } from './bound-actions.tsx'

          // Two inline actions with same-shaped closures. \`preview\` captures a
          // request-derived value, \`readSecret\` a server-decided one.
          export function Root(props: { url: URL }) {
            const label = props.url.searchParams.get('label') ?? 'guest'
            const role = 'viewer'

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
      // The attacker controls `label` through the URL, so `preview`'s encrypted
      // closure carries an attacker-chosen value ("admin").
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

      // Replay a request body against `readSecret`'s action id.
      const callReadSecret = (contentType: string, body: string) =>
        page.request.post(f.url('/_.rsc'), {
          headers: {
            'content-type': contentType,
            'x-rsc-action': readSecret.id,
          },
          data: body,
        })
      const expectRejected = async (
        response: Awaited<ReturnType<typeof callReadSecret>>,
      ) => {
        expect(await response.text()).not.toContain('BOUND_ARGS_SECRET')
        expect(response.status()).toBe(500)
      }

      // `readSecret`'s own closure still works, and its `role` capture is "viewer".
      const own = await callReadSecret(readSecret.contentType, readSecret.body)
      expect(own.status()).toBe(200)
      expect(await own.text()).toContain('DENIED:viewer')

      // Attack: send `preview`'s closure as `readSecret`'s. Without binding, it
      // would decrypt as `readSecret`'s captures, making `role` "admin" and
      // returning the secret. Bound to `preview`'s id, it fails to decrypt.
      await expectRejected(
        await callReadSecret(preview.contentType, preview.body),
      )

      // A closure encrypted with the right key but without an action id (the
      // format before binding) is also rejected. `flight` is the serialized
      // capture array `["admin"]`.
      const flight = '0:["admin"]\n'
      await expectRejected(
        await callReadSecret(
          'text/plain;charset=UTF-8',
          JSON.stringify([await seal(flight)]),
        ),
      )

      // Control: the same payload encrypted for `readSecret`'s id is accepted and
      // returns the secret, so the rejections above come from the id check, not
      // from a malformed request.
      const bound = await callReadSecret(
        'text/plain;charset=UTF-8',
        JSON.stringify([await seal(flight, readSecret.id)]),
      )
      expect(bound.status()).toBe(200)
      expect(await bound.text()).toContain('BOUND_ARGS_SECRET')
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

// Encrypt an already serialized closure the way `encryptActionBoundArgs` does.
async function seal(flight: string, actionId?: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(ENCRYPTION_KEY) as BufferSource,
    'AES-GCM',
    false,
    ['encrypt'],
  )
  return encryptBuffer(
    new TextEncoder().encode(flight),
    key,
    actionId === undefined ? undefined : new TextEncoder().encode(actionId),
  )
}
