import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

// Server reference ids in a request come from the client, so the server require
// memo must not keep an entry for each distinct id a client sends.
test.describe(() => {
  const root = 'examples/e2e/temp/server-require-memo'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'src/framework/entry.rsc.tsx': {
          edit: (s) =>
            s.replace(
              `async function handler(request: Request): Promise<Response> {`,
              /* tsx */ `
async function handler(request: Request): Promise<Response> {
  const testResponse = await handleMemoTestRequest(request)
  if (testResponse) return testResponse
`,
            ) +
            /* tsx */ `
import v8 from 'node:v8'
import vm from 'node:vm'

// Hold every promise the server require returns for a test id weakly.
// Once the requests are done, only the memo can keep them alive.
const serverRequire = (globalThis as any).__vite_rsc_server_require__
const seen = new WeakSet<object>()
const loads: WeakRef<object>[] = []
;(globalThis as any).__vite_rsc_server_require__ = (id: string) => {
  const promise = serverRequire(id)
  if (id.includes('memo-test-') && !seen.has(promise)) {
    seen.add(promise)
    loads.push(new WeakRef(promise))
  }
  return promise
}

v8.setFlagsFromString('--expose-gc')
const gc: () => void = vm.runInNewContext('gc')

async function handleMemoTestRequest(request: Request) {
  const url = new URL(request.url)
  if (url.pathname === '/__memo-test/retained') {
    for (let i = 0; i < 5; i++) {
      gc()
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    return Response.json({
      loads: loads.length,
      retained: loads.filter((ref) => ref.deref()).length,
    })
  }
}
`,
        },
      },
    })
  })

  function defineMemoTest(f: Fixture) {
    test('server require memo keeps no entry for untrusted ids', async ({
      page,
      request,
    }) => {
      // record a real action id from the counter form's hydrated call
      await page.goto(f.url())
      await waitForHydration(page)
      const actionRequest = page.waitForRequest(
        (request) =>
          request.method() === 'POST' && !!request.headers()['x-rsc-action'],
      )
      await page.getByRole('button', { name: /Server Counter/ }).click()
      const actionId = (await actionRequest).headers()['x-rsc-action']!
      const [knownId, knownName] = actionId.split('#') as [string, string]

      const unknown = (i: number) => `/memo-test-${i}#x`
      // ids with the internal markers are rejected by the server manifest
      const marked = [
        (i: number) => `$$decode-client:/memo-test-${i}#x`,
        (i: number) => `$$preserve:/memo-test-${i}#x`,
        (i: number) => `${knownId}$$cache=memo-test-${i}#${knownName}`,
      ]
      // a few distinct ids per variant, each of which would be a memo entry.
      // A progressive form post names its action in a field, which React
      // resolves through the server manifest.
      const perVariant = 3
      let seq = 0
      for (const toId of [unknown, ...marked]) {
        for (let i = 0; i < perVariant; i++) {
          const id = toId(seq++)
          const body = new FormData()
          body.set('$ACTION_ID_' + id, '')
          const response = await request.post(f.url(), { multipart: body })
          expect(response.status()).toBe(500)
          if (toId !== unknown) {
            await expect
              .poll(() => f.proc().stderr())
              .toContain(`server reference not found '${id.split('#')[0]}'`)
          }
        }
      }

      const result = await (
        await request.get(f.url('__memo-test/retained'))
      ).json()
      // unknown ids still reach the require, so this checks the probe saw them
      expect(result.loads).toBeGreaterThanOrEqual(perVariant)
      expect(result.retained).toBe(0)
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineMemoTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineMemoTest(f)
  })
})
