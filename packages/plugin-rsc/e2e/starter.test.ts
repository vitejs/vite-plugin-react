import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoReload, testNoJs, waitForHydration } from './helper'

test.describe('dev-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'dev' })
  defineTest(f)
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'build' })
  defineTest(f)
})

test.describe('dev-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'dev' })
  defineTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'build' })
  defineTest(f)
})

test.describe('dev-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'dev' })
  defineTest(f, 'no-ssr')
})

test.describe('build-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'build' })
  defineTest(f, 'no-ssr')
})

function defineTest(f: Fixture, variant?: 'no-ssr') {
  f.root.includes('no-ssr')
  test('basic', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
  })

  test('client component', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()
  })

  test('server action @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await page.getByRole('button', { name: 'Server Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Server Counter: 1' }),
    ).toBeVisible()
  })

  testNoJs('server action @nojs', async ({ page }) => {
    test.skip(variant === 'no-ssr')

    await page.goto(f.url())
    await page.getByRole('button', { name: 'Server Counter: 1' }).click()
    await expect(
      page.getByRole('button', { name: 'Server Counter: 2' }),
    ).toBeVisible()
  })

  test('client hmr', async ({ page }) => {
    test.skip(f.mode === 'build')

    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()

    const editor = f.createEditor(`src/client.tsx`)
    editor.edit((s) => s.replace('Client Counter', 'Client [edit] Counter'))
    await expect(
      page.getByRole('button', { name: 'Client [edit] Counter: 1' }),
    ).toBeVisible()

    if (variant === 'no-ssr') {
      editor.reset()
      await page.getByRole('button', { name: 'Client Counter: 1' }).click()
      return
    }

    // check next ssr is also updated
    const res = await page.goto(f.url())
    expect(await res?.text()).toContain('Client [edit] Counter')
    await waitForHydration(page)
    editor.reset()
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
  })

  test('image assets', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByAltText('Vite logo')).not.toHaveJSProperty(
      'naturalWidth',
      0,
    )
    await expect(page.getByAltText('React logo')).not.toHaveJSProperty(
      'naturalWidth',
      0,
    )
  })
}
