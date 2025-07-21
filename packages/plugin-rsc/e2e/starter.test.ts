import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import {
  expectNoReload,
  testNoJs,
  waitForHydration as waitForHydration_,
} from './helper'
import path from 'node:path'
import fs from 'node:fs'

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

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/react-compiler'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.ts': /* js */ `
          import rsc from '@vitejs/plugin-rsc'
          import react from '@vitejs/plugin-react'
          import { defineConfig } from 'vite'

          export default defineConfig({
            plugins: [
              react({
                babel: { plugins: ['babel-plugin-react-compiler'] },
              }).map((p) => ({
                ...p,
                applyToEnvironment: (e) => e.name === 'client',
              })),
              rsc({
                entries: {
                  client: './src/framework/entry.browser.tsx',
                  ssr: './src/framework/entry.ssr.tsx',
                  rsc: './src/framework/entry.rsc.tsx',
                }
              }),
            ],
          })
        `,
      },
    })
  })

  test.describe('dev-react-compiler', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)

    test('verify react compiler', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration_(page)
      const res = await page.request.get(f.url('src/client.tsx'))
      expect(await res.text()).toContain('react.memo_cache_sentinel')
    })
  })

  test.describe('build-react-compiler', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest(f)
  })
})

function defineTest(f: Fixture, variant?: 'no-ssr') {
  const waitForHydration: typeof waitForHydration_ = (page) =>
    waitForHydration_(page, variant === 'no-ssr' ? '#root' : 'body')

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

  test.describe(() => {
    test.skip(f.mode === 'build')

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
    await expect(page.locator('.read-the-docs')).toHaveCSS(
      'color',
      'rgb(136, 136, 136)',
    )
  })

  test.describe(() => {
    test.skip(variant === 'no-ssr')

    testNoJs('css @nojs', async ({ page }) => {
      await page.goto(f.url())
      await expect(page.locator('.read-the-docs')).toHaveCSS(
        'color',
        'rgb(136, 136, 136)',
      )
    })
  })
}
