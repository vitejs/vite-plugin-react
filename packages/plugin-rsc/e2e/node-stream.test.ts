import { expect, test } from '@playwright/test'
import { useFixture, type Fixture } from './fixture'
import { waitForHydration } from './helper'
import { defineStarterTest } from './starter'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'dev' })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  defineStarterTest(f)

  test('multipart server action', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const [request, response] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method() === 'POST' && request.url().endsWith('_.rsc'),
      ),
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('_.rsc'),
      ),
      page.getByRole('button', { name: /Server Counter:/ }).click(),
    ])
    expect(request.headers()['content-type']).toContain('multipart/form-data')
    expect(response.ok()).toBe(true)
  })
}
