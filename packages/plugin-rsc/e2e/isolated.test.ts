import { expect, test, type Page } from '@playwright/test'
import { setupIsolatedFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'
import path from 'node:path'
import os from 'node:os'
import * as vite from 'vite'
import { waitForHydration } from './helper'
import { x } from 'tinyexec'

test.describe(() => {
  // use RUNNER_TEMP on Github Actions
  // https://github.com/actions/toolkit/issues/518
  const tmpRoot = path.join(process.env['RUNNER_TEMP'] || os.tmpdir(), 'test-vite-rsc')
  test.beforeAll(async () => {
    await setupIsolatedFixture({ src: 'examples/starter', dest: tmpRoot })
  })

  test.describe('dev-isolated', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)

    test('verify react-server-dom-webpack', async ({ page }) => {
      await testReactServerDom(page, f.url(), true)
    })
  })

  test.describe('build-isolated', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})

test.describe('vite 6', () => {
  test.skip(!!process.env.ECOSYSTEM_CI || 'rolldownVersion' in vite)

  const tmpRoot = path.join(process.env['RUNNER_TEMP'] || os.tmpdir(), 'test-vite-rsc-vite-6')
  test.beforeAll(async () => {
    await setupIsolatedFixture({
      src: 'examples/starter',
      dest: tmpRoot,
      overrides: {
        vite: '^6',
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})

test.describe('react-server-dom-webpack', () => {
  const tmpRoot = path.join(process.env['RUNNER_TEMP'] || os.tmpdir(), 'test-vite-rsc-webpack')
  test.beforeAll(async () => {
    await setupIsolatedFixture({
      src: 'examples/starter',
      dest: tmpRoot,
    })
    const {
      default: { version },
    } = await import('react-server-dom-webpack/package.json', {
      with: { type: 'json' },
    })
    await x('pnpm', ['i', `react-server-dom-webpack@${version}`], {
      throwOnError: true,
      nodeOptions: {
        cwd: tmpRoot,
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)

    test('verify react-server-dom-webpack', async ({ page }) => {
      await testReactServerDom(page, f.url(), false)
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})

async function testReactServerDom(page: Page, url: string, expectVendor: boolean) {
  let hasVendor = false
  let hasNonVendor = false
  page.on('request', async (request) => {
    if (request.url().includes('.vite/deps/react-server-dom-webpack_client__browser.js')) {
      hasNonVendor = true
    }
    if (
      request
        .url()
        .includes('.vite/deps/@vitejs_plugin-rsc_vendor_react-server-dom_client__browser.js')
    ) {
      hasVendor = true
    }
  })
  await page.goto(url)
  await waitForHydration(page)
  if (expectVendor) {
    expect(hasVendor).toBe(true)
    expect(hasNonVendor).toBe(false)
  } else {
    expect(hasVendor).toBe(false)
    expect(hasNonVendor).toBe(true)
  }
}
