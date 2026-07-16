import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { testNoJs } from './helper'

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/ssr-encode-form-action',
    mode: 'dev',
  })
  defineTests(f)
})

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/ssr-encode-form-action',
    mode: 'build',
  })
  defineTests(f)
})

function defineTests(f: Fixture) {
  testNoJs('custom form action encoding', async ({ page }) => {
    await page.goto(f.url())

    await expect(page.getByTestId('result')).toHaveText('initial')
    const form = page.getByTestId('server-action-form')
    await expect(form).toHaveAttribute('action', '/?custom-action=1')
    await expect(
      form.locator('input[name="$ACTION_REF_custom_prefix"]'),
    ).toHaveCount(1)

    await page.getByRole('button', { name: 'test-action' }).click()
    await expect(page).toHaveURL(/\?custom-action=1$/)
    await expect(page.getByTestId('result')).toHaveText('bound:form')
  })
}
