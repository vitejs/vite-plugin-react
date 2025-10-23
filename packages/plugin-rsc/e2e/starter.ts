import { type Fixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration as waitForHydration_,
} from './helper'
import { expect, test } from '@playwright/test'

export function defineStarterTest(
  f: Fixture,
  variant?: 'no-ssr' | 'dev-production' | 'browser-mode',
) {
  const waitForHydration: typeof waitForHydration_ = (page) =>
    waitForHydration_(
      page,
      variant === 'no-ssr' || variant === 'browser-mode' ? '#root' : 'body',
    )

  test('basic', async ({ page }) => {
    using _ = expectNoPageError(page)
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
    test.skip(variant === 'no-ssr' || variant === 'browser-mode')

    await page.goto(f.url())
    await page.getByRole('button', { name: 'Server Counter: 1' }).click()
    await expect(
      page.getByRole('button', { name: 'Server Counter: 2' }),
    ).toBeVisible()
  })

  test('client hmr', async ({ page }) => {
    test.skip(
      f.mode === 'build' ||
        variant === 'dev-production' ||
        variant === 'browser-mode',
    )

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

  test.describe(() => {
    test.skip(f.mode === 'build' || variant === 'browser-mode')

    test('server hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await expect(page.getByText('Vite + RSC')).toBeVisible()
      const editor = f.createEditor('src/root.tsx')
      editor.edit((s) =>
        s.replace('<h1>Vite + RSC</h1>', '<h1>Vite x RSC</h1>'),
      )
      await expect(page.getByText('Vite x RSC')).toBeVisible()
      editor.reset()
      await expect(page.getByText('Vite + RSC')).toBeVisible()
    })
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

  test('css @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.card').nth(0)).toHaveCSS('padding-left', '16px')
  })

  test.describe(() => {
    test.skip(variant === 'no-ssr' || variant === 'browser-mode')

    testNoJs('css @nojs', async ({ page }) => {
      await page.goto(f.url())
      await expect(page.locator('.card').nth(0)).toHaveCSS(
        'padding-left',
        '16px',
      )
    })
  })
}
