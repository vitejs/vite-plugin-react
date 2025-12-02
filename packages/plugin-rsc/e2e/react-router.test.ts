import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import { expectNoReload, testNoJs, waitForHydration } from './helper'
import { readFileSync } from 'node:fs'
import React from 'react'

test.describe('dev-default', () => {
  test.skip(/canary|experimental/.test(React.version))

  const f = useFixture({ root: 'examples/react-router', mode: 'dev' })
  defineTest(f)
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/react-router', mode: 'build' })
  defineTest(f)
})

test.describe('dev-cloudflare', () => {
  test.skip(/canary|experimental/.test(React.version))

  const f = useFixture({
    root: 'examples/react-router',
    mode: 'dev',
    command: 'pnpm cf-dev',
  })
  defineTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({
    root: 'examples/react-router',
    mode: 'build',
    buildCommand: 'pnpm cf-build',
    command: 'pnpm cf-preview',
  })
  defineTest(f)
})

function defineTest(f: Fixture) {
  test('client', async ({ page }) => {
    await page.goto(f.url('./about'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client counter: 0' }).click()
    await expect(page.getByRole('button', { name: 'Client counter: 1' })).toBeVisible()
  })

  test('navigation', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)

    await page.getByText('This is the home page.').click()

    await page.getByRole('link', { name: 'About' }).click()
    await page.waitForURL(f.url('./about'))
    await page.getByText('This is the about page.').click()

    await page.getByRole('link', { name: 'Home' }).click()
    await page.waitForURL(f.url())
    await page.getByText('This is the home page.').click()
  })

  test.describe(() => {
    test.skip(f.mode !== 'build')

    testNoJs('ssr modulepreload', async ({ page }) => {
      await page.goto(f.url())
      const srcs = await page
        .locator(`head >> link[rel="modulepreload"]`)
        .evaluateAll((elements) => elements.map((el) => el.getAttribute('href')))
      const manifest = JSON.parse(
        readFileSync(f.root + '/dist/ssr/__vite_rsc_assets_manifest.js', 'utf-8').slice(
          'export default '.length,
        ),
      )
      const hashString = (v: string) =>
        createHash('sha256').update(v).digest().toString('hex').slice(0, 12)
      const deps = manifest.clientReferenceDeps[hashString('app/routes/home.client.tsx')]
      expect(srcs).toEqual(expect.arrayContaining(deps.js))
    })
  })

  test.describe(() => {
    test.skip(f.mode !== 'dev')

    test('client hmr', async ({ page }) => {
      await page.goto(f.url('./about'))
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      await page.getByRole('button', { name: 'Client counter: 0' }).click()
      await expect(page.getByRole('button', { name: 'Client counter: 1' })).toBeVisible()

      const editor = f.createEditor('app/routes/about.tsx')
      editor.edit((s) => s.replace('Client counter:', 'Client [edit] counter:'))

      await expect(page.getByRole('button', { name: 'Client [edit] counter: 1' })).toBeVisible()
    })

    test('server hmr', async ({ page }) => {
      await page.goto(f.url('/'))
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      await page.getByText('This is the home page.').click()

      const editor = f.createEditor('app/routes/home.tsx')
      editor.edit((s) => s.replace('This is the home page.', 'This is the home [edit] page.'))

      await page.getByText('This is the home [edit] page.').click()
    })
  })

  test('server css code split', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.test-style-home')).toHaveCSS('color', 'rgb(250, 150, 0)')

    // client side navigation to "/about" keeps "/" styles
    await page.getByRole('link', { name: 'About' }).click()
    await page.waitForURL(f.url('./about'))
    await expect(page.locator('.test-style-home')).toHaveCSS('color', 'rgb(250, 150, 0)')

    // SSR of "/about" doesn't include "/" styles
    await page.goto(f.url('./about'))
    await waitForHydration(page)
    await expect(page.locator('.test-style-home')).not.toHaveCSS('color', 'rgb(250, 150, 0)')

    // client side navigation to "/" loads "/" styles
    await page.getByRole('link', { name: 'Home' }).click()
    await page.waitForURL(f.url())
    await expect(page.locator('.test-style-home')).toHaveCSS('color', 'rgb(250, 150, 0)')
  })

  test('vite-rsc-css-export', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('root-style')).toHaveCSS('color', 'rgb(0, 0, 255)')
  })

  test('useActionState', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByTestId('use-action-state-jsx').getByRole('button').click()
    await expect(page.getByTestId('use-action-state-jsx')).toContainText(/\(ok\)/)
    await page.getByTestId('use-action-state-jsx').getByRole('button').click()
    await expect(page.getByTestId('use-action-state-jsx')).toContainText(/\(ok\).*\(ok\)/)
  })
}
