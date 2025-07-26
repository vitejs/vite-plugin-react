import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineTest } from './starter'
import { waitForHydration } from './helper'

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

test.describe('dev-production', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'dev',
    cliOptions: {
      env: { NODE_ENV: 'production' },
    },
  })
  defineTest(f, 'dev-production')

  test('verify production', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const res = await page.request.get(f.url('src/client.tsx'))
    expect(await res.text()).not.toContain('jsxDEV')
  })
})

test.describe('build-development', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'build',
    cliOptions: {
      env: { NODE_ENV: 'development' },
    },
  })
  defineTest(f)

  test('verify development', async ({ page }) => {
    let output!: string
    page.on('response', async (response) => {
      if (response.url().match(/\/assets\/client-[\w-]+\.js$/)) {
        output = await response.text()
      }
    })
    await page.goto(f.url())
    await waitForHydration(page)
    expect(output).toContain('jsxDEV')
  })
})
