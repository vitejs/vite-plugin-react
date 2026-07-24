import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/client-first', mode: 'dev' })
  defineTests(f)

  test('client HMR for a module shared with the RSC graph', async ({
    page,
  }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)

    const counter = page.getByTestId('count')
    await counter.click()
    await expect(counter).toHaveText('count: 1')

    const editor = f.createEditor('src/routes/page.tsx')
    editor.edit((source) =>
      source.replace('client: baseline', 'client: edited'),
    )

    await expect(page.getByTestId('client')).toHaveText('client: edited')
    await expect(counter).toHaveText('count: 1')

    editor.reset()
    await expect(page.getByTestId('client')).toHaveText('client: baseline')
    await expect(counter).toHaveText('count: 1')
  })
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/client-first', mode: 'build' })
  defineTests(f)
})

function defineTests(f: Fixture) {
  test('renders an RSC function result in a client-owned page', async ({
    page,
  }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())

    await expect(page.getByTestId('client')).toHaveText('client: baseline')
    await expect(page.getByTestId('server')).toHaveText('server: baseline')

    await waitForHydration(page)
    const counter = page.getByTestId('count')
    await counter.click()
    await expect(counter).toHaveText('count: 1')
  })
}
