import { webcrypto } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

// A fixed key lets the test seal closures the way an older or tampered
// encryption would.
const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

async function seal(flight: string, actionId?: string) {
  const key = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(ENCRYPTION_KEY, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const iv = webcrypto.getRandomValues(new Uint8Array(16))
  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      ...(actionId && { additionalData: new TextEncoder().encode(actionId) }),
    },
    key,
    new TextEncoder().encode(flight),
  )
  return Buffer.concat([iv, new Uint8Array(encrypted)]).toString('base64')
}

type CapturedAction = { id: string; contentType: string; body: string }

async function captureAction(
  page: Page,
  button: string,
  result: string,
): Promise<CapturedAction> {
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
              `rsc({ bindActionEncryption: true, defineEncryptionKey: ${JSON.stringify(
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

  function defineBindingTest(f: Fixture) {
    test('closures only decrypt for their own action', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url('/?label=admin'))
      await waitForHydration(page)

      const preview = await captureAction(page, 'preview', 'PREVIEW:admin')
      const readSecret = await captureAction(
        page,
        'read secret',
        'DENIED:viewer',
      )
      expect(preview.id).not.toBe(readSecret.id)

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

      // readSecret's own closure
      const own = await callReadSecret(readSecret.contentType, readSecret.body)
      expect(own.status()).toBe(200)
      expect(await own.text()).toContain('DENIED:viewer')

      // preview's closure (capturing `label=admin`) replayed as readSecret's
      await expectRejected(
        await callReadSecret(preview.contentType, preview.body),
      )

      // a closure encrypted without an action id
      const flight = '0:["admin"]\n'
      await expectRejected(
        await callReadSecret(
          'text/plain;charset=UTF-8',
          JSON.stringify([await seal(flight)]),
        ),
      )

      // control: a closure sealed for readSecret's id decrypts as its captures
      const bound = await callReadSecret(
        'text/plain;charset=UTF-8',
        JSON.stringify([await seal(flight, readSecret.id)]),
      )
      expect(bound.status()).toBe(200)
      expect(await bound.text()).toContain('BOUND_ARGS_SECRET')
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineBindingTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineBindingTest(f)
  })
})
