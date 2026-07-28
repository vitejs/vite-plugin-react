import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'build',
  })

  test('tracks and executes an object-wrapped server action', async ({
    page,
  }) => {
    const reachability: Record<
      string,
      { importId: string; serverReferenceIds: string[] }
    > = JSON.parse(
      f.createEditor('dist/client/reference-reachability.json').read(),
    )
    const clientReference = Object.values(reachability).find((value) =>
      value.importId.endsWith('/src/client-form.jsx'),
    )
    expect(clientReference?.serverReferenceIds).toEqual([
      expect.stringMatching(/#objectWrappedAction$/),
    ])

    await page.goto(f.url())
    await waitForHydration(page)
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('_.rsc'),
    )
    await page.getByTestId('object-wrapped-action').click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('OBJECT_WRAPPED_OK')
  })
})
