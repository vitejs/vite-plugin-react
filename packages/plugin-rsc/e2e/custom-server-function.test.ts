import { expect, test, type Page } from '@playwright/test'
import { useFixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration,
} from './helper'

test.describe('dev-custom-server-function', () => {
  const f = useFixture({
    root: 'examples/custom-server-function',
    mode: 'dev',
  })
  defineTest(f)

  test('moves an action between custom and built-in ownership', async ({
    page,
  }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await using _noReload = await expectNoReload(page)

    const editor = f.createEditor('src/features/mixed-directives/actions.ts')
    // Switch one export from the custom plugin to the built-in plugin. HMR
    // must remove the custom claim while preserving the module's other claims.
    editor.edit((source) =>
      source
        .replace(`'use custom-server'`, `'use server'`)
        .replace(
          `customLabel = 'Custom'`,
          `customLabel = 'Custom changed to built-in'`,
        )
        .replace('customCount++', 'customCount += 10'),
    )

    await expect(
      page.getByRole('button', { name: 'Custom changed to built-in: 0' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Built-in: 0', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Custom changed to built-in: 0' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Custom changed to built-in: 10' }),
    ).toBeVisible()

    // Switch the export back and verify neither owner retained stale state.
    editor.reset()
    await expect(page.getByRole('button', { name: 'Custom: 0' })).toBeVisible()
    await page.getByRole('button', { name: 'Built-in: 0', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Custom: 0' }).click()
    await expect(page.getByRole('button', { name: 'Custom: 1' })).toBeVisible()
  })
})

test.describe('build-custom-server-function', () => {
  const f = useFixture({
    root: 'examples/custom-server-function',
    mode: 'build',
  })
  defineTest(f)
})

function defineTest(f: ReturnType<typeof useFixture>) {
  test('built-in and custom server functions', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    await testActions(page)
  })

  testNoJs('progressive forms', async ({ page }) => {
    await page.goto(f.url())
    await testActions(page)
  })

  async function testActions(page: Page) {
    // The first two actions are inline functions in one RSC-reachable module.
    await page.getByRole('button', { name: 'Built-in: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 1' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Custom: 0' }).click()
    await expect(page.getByRole('button', { name: 'Custom: 1' })).toBeVisible()

    // This module is only imported by a Client Component, so its implementation
    // reaches the RSC build through the aggregated server reference manifest.
    await page.getByRole('button', { name: 'From client: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'From client: 1' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(
      page.getByRole('button', { name: 'Built-in: 0' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Custom: 0' })).toBeVisible()
  }
}
