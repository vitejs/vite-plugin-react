import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import { type Fixture, useFixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration,
} from './helper'

test.describe('dev-default', () => {
  const f = useFixture({ root: 'examples/basic', mode: 'dev' })
  defineTest(f)
})

test.describe('dev-initial', () => {
  const f = useFixture({ root: 'examples/basic', mode: 'dev' })

  // verify css is collected properly on server startup (i.e. empty module graph)
  testNoJs('style', async ({ page }) => {
    await page.goto(f.url('./'))
    await expect(page.locator('.test-style-client')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(page.locator('.test-style-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(page.locator('.test-tw-client')).toHaveCSS(
      'color',
      // blue-500
      'rgb(0, 0, 255)',
    )
    await expect(page.locator('.test-tw-server')).toHaveCSS(
      'color',
      // red-500
      'rgb(255, 0, 0)',
    )
  })
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/basic', mode: 'build' })
  defineTest(f)
})

test.describe('dev-non-optimized-cjs', () => {
  test.beforeAll(async () => {
    // remove explicitly added optimizeDeps.include
    const editor = f.createEditor('vite.config.ts')
    editor.edit((s) =>
      s.replace(
        `include: ['@vitejs/test-dep-transitive-cjs > @vitejs/test-dep-cjs'],`,
        ``,
      ),
    )
  })

  const f = useFixture({
    root: 'examples/basic',
    mode: 'dev',
    cliOptions: {
      env: {
        DEBUG: 'vite-rsc:cjs',
      },
    },
  })

  test('show warning', async ({ page }) => {
    await page.goto(f.url())
    expect(f.proc().stderr()).toMatch(
      /non-optimized CJS dependency in 'ssr' environment.*@vitejs\/test-dep-cjs\/index.js/,
    )
  })
})

test.describe('dev-inconsistent-client-optimization', () => {
  test.beforeAll(async () => {
    // remove explicitly added optimizeDeps.exclude
    const editor = f.createEditor('vite.config.ts')
    editor.edit((s) =>
      s.replace(`'@vitejs/test-dep-client-in-server2/client',`, ``),
    )
  })

  const f = useFixture({
    root: 'examples/basic',
    mode: 'dev',
  })

  test('show warning', async ({ page }) => {
    await page.goto(f.url())
    expect(f.proc().stderr()).toContain(
      'client component dependency is inconsistently optimized.',
    )
  })
})

function defineTest(f: Fixture) {
  test('basic', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
    expect(f.proc().stderr()).toBe('')
  })

  test('client component', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'client-counter: 0' }).click()
    await page.getByRole('button', { name: 'client-counter: 1' }).click()
  })

  test('server action @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testAction(page)
  })

  testNoJs('server action @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testAction(page)
  })

  async function testAction(page: Page) {
    await page.getByRole('button', { name: 'server-counter: 0' }).click()
    await page.getByRole('button', { name: 'server-counter: 1' }).click()
    await expect(
      page.getByRole('button', { name: 'server-counter: 2' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'server-counter-reset' }).click()
    await expect(
      page.getByRole('button', { name: 'server-counter: 0' }),
    ).toBeVisible()
  }

  test('useActionState @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testUseActionState(page)
  })

  testNoJs('useActionState @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testUseActionState(page)
  })

  async function testUseActionState(page: Page) {
    await expect(page.getByTestId('use-action-state')).toContainText(
      'test-useActionState: 0',
    )
    await page.getByTestId('use-action-state').click()
    await expect(page.getByTestId('use-action-state')).toContainText(
      'test-useActionState: 1',
    )
    await page.getByTestId('use-action-state').click()
    await expect(page.getByTestId('use-action-state')).toContainText(
      'test-useActionState: 2',
    )
  }

  test('useActionState with jsx @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testUseActionStateJsx(page)
  })

  testNoJs('useActionState with jsx @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testUseActionStateJsx(page, { js: false })
  })

  async function testUseActionStateJsx(page: Page, options?: { js?: boolean }) {
    await page.getByTestId('use-action-state-jsx').getByRole('button').click()
    await expect(page.getByTestId('use-action-state-jsx')).toContainText(
      /\(ok\)/,
    )

    // 1st call "works" but it shows an error during reponse and it breaks 2nd call.
    //   Failed to serialize an action for progressive enhancement:
    //   Error: React Element cannot be passed to Server Functions from the Client without a temporary reference set. Pass a TemporaryReferenceSet to the options.
    //     [Promise, <span/>]
    if (!options?.js) return

    await page.getByTestId('use-action-state-jsx').getByRole('button').click()
    await expect(page.getByTestId('use-action-state-jsx')).toContainText(
      /\(ok\).*\(ok\)/,
    )
  }

  test.describe(() => {
    test.skip(f.mode !== 'build')

    testNoJs('module preload on ssr', async ({ page }) => {
      await page.goto(f.url())
      const srcs = await page
        .locator(`head >> link[rel="modulepreload"]`)
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute('href')),
        )
      const manifest = JSON.parse(
        readFileSync(
          f.root + '/dist/ssr/__vite_rsc_assets_manifest.js',
          'utf-8',
        ).slice('export default '.length),
      )
      const hashString = (v: string) =>
        createHash('sha256').update(v).digest().toString('hex').slice(0, 12)
      const deps =
        manifest.clientReferenceDeps[hashString('src/routes/client.tsx')]
      expect(srcs).toEqual(expect.arrayContaining(deps.js))
    })
  })

  test.describe(() => {
    test.skip(f.mode !== 'dev')

    test('server reference update @js', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await testServerActionUpdate(page, { js: true })
    })

    test('server reference update @nojs', async ({ page }) => {
      await page.goto(f.url())
      await testServerActionUpdate(page, { js: false })
    })
  })

  async function testServerActionUpdate(page: Page, options: { js: boolean }) {
    await page.getByRole('button', { name: 'server-counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'server-counter: 1' }),
    ).toBeVisible()

    // update server code
    const editor = f.createEditor('src/routes/action/action.tsx')
    editor.edit((s) =>
      s.replace('const TEST_UPDATE = 1\n', 'const TEST_UPDATE = 10\n'),
    )
    await expect(async () => {
      if (!options.js) await page.goto(f.url())
      await expect(
        page.getByRole('button', { name: 'server-counter: 0' }),
      ).toBeVisible({ timeout: 10 })
    }).toPass()

    await page.getByRole('button', { name: 'server-counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'server-counter: 10' }),
    ).toBeVisible()

    editor.reset()
    await expect(async () => {
      if (!options.js) await page.goto(f.url())
      await expect(
        page.getByRole('button', { name: 'server-counter: 0' }),
      ).toBeVisible({ timeout: 10 })
    }).toPass()
  }

  test.describe(() => {
    test.skip(f.mode !== 'dev')

    test('client hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await page.getByRole('button', { name: 'client-counter: 0' }).click()
      await expect(
        page.getByRole('button', { name: 'client-counter: 1' }),
      ).toBeVisible()

      const editor = f.createEditor('src/routes/client.tsx')
      editor.edit((s) => s.replace('client-counter', 'client-[edit]-counter'))
      await expect(
        page.getByRole('button', { name: 'client-[edit]-counter: 1' }),
      ).toBeVisible()

      // check next ssr is also updated
      const res = await page.goto(f.url())
      expect(await res?.text()).toContain('client-[edit]-counter')
      await waitForHydration(page)
      editor.reset()
      await page.getByRole('button', { name: 'client-counter: 0' }).click()
    })

    test('non-boundary client hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)

      const locator = page.getByTestId('test-hmr-client-dep')
      await expect(locator).toHaveText('test-hmr-client-dep: 0[ok]')
      await locator.locator('button').click()
      await expect(locator).toHaveText('test-hmr-client-dep: 1[ok]')

      const editor = f.createEditor('src/routes/hmr-client-dep/client-dep.tsx')
      editor.edit((s) => s.replace('[ok]', '[ok-edit]'))
      await expect(locator).toHaveText('test-hmr-client-dep: 1[ok-edit]')

      // check next ssr is also updated
      const res = await page.reload()
      expect(await res?.text()).toContain('[ok-edit]')

      await waitForHydration(page)
      editor.reset()
      await expect(locator).toHaveText('test-hmr-client-dep: 0[ok]')
    })

    test('server hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      const editor = f.createEditor('src/routes/action/server.tsx')
      editor.edit((s) => s.replace('server-counter', 'server-[edit]-counter'))
      await expect(
        page.getByRole('button', { name: 'server-[edit]-counter: 0' }),
      ).toBeVisible()
      editor.reset()
      await expect(
        page.getByRole('button', { name: 'server-counter: 0' }),
      ).toBeVisible()
    })

    test('module invalidation', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      // change child module state
      const locator = page.getByTestId('test-module-invalidation-server')
      await expect(locator).toContainText('[dep: 0]')
      locator.getByRole('button').click()
      await expect(locator).toContainText('[dep: 1]')

      // change parent module
      const editor = f.createEditor('src/routes/module-invalidation/server.tsx')
      editor.edit((s) => s.replace('[dep:', '[dep-edit:'))

      // preserve child module state
      await expect(locator).toContainText('[dep-edit: 1]')
      editor.reset()
      await expect(locator).toContainText('[dep: 1]')
    })

    test('shared hmr basic', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      // Test initial state
      await expect(page.getByTestId('test-hmr-shared-server')).toContainText(
        '(shared1, shared2)',
      )
      await expect(page.getByTestId('test-hmr-shared-client')).toContainText(
        '(shared1, shared2)',
      )

      // Test 1: Component HMR (shared1.tsx)
      const editor1 = f.createEditor('src/routes/hmr-shared/shared1.tsx')
      editor1.edit((s) => s.replace('shared1', 'shared1-edit'))

      // Verify both server and client components updated
      await expect(page.getByTestId('test-hmr-shared-server')).toContainText(
        '(shared1-edit, shared2)',
      )
      await expect(page.getByTestId('test-hmr-shared-client')).toContainText(
        '(shared1-edit, shared2)',
      )

      editor1.reset()
      await expect(page.getByTestId('test-hmr-shared-server')).toContainText(
        '(shared1, shared2)',
      )
      await expect(page.getByTestId('test-hmr-shared-client')).toContainText(
        '(shared1, shared2)',
      )

      // Test 2: Non-component HMR (shared2.tsx)
      const editor2 = f.createEditor('src/routes/hmr-shared/shared2.tsx')
      editor2.edit((s) => s.replace('shared2', 'shared2-edit'))

      // Verify both server and client components updated
      await expect(page.getByTestId('test-hmr-shared-server')).toContainText(
        '(shared1, shared2-edit)',
      )
      await expect(page.getByTestId('test-hmr-shared-client')).toContainText(
        '(shared1, shared2-edit)',
      )

      editor2.reset()
      await expect(page.getByTestId('test-hmr-shared-server')).toContainText(
        '(shared1, shared2)',
      )
      await expect(page.getByTestId('test-hmr-shared-client')).toContainText(
        '(shared1, shared2)',
      )
    })

    // for this use case to work, server refetch/render and client hmr needs to applied atomically
    // at the same time. Next.js doesn't seem to support this either.
    // https://github.com/hi-ogawa/reproductions/tree/main/next-rsc-hmr-shared-module
    test('shared hmr not atomic', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('test-hmr-shared-atomic')).toContainText(
        'ok (test-shared)',
      )

      // non-atomic update causes an error
      const editor = f.createEditor('src/routes/hmr-shared/atomic/shared.tsx')
      editor.edit((s) => s.replace('test-shared', 'test-shared-edit'))
      await expect(page.getByTestId('test-hmr-shared-atomic')).toContainText(
        'ErrorBoundary',
      )

      await page.reload()
      await expect(page.getByText('ok (test-shared-edit)')).toBeVisible()

      // non-atomic update causes an error
      editor.reset()
      await expect(page.getByTestId('test-hmr-shared-atomic')).toContainText(
        'ErrorBoundary',
      )

      await page.reload()
      await expect(page.getByText('ok (test-shared)')).toBeVisible()
    })

    test('hmr switch server to client', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      await expect(page.getByTestId('test-hmr-switch-server')).toContainText(
        '(useState: false)',
      )
      const editor = f.createEditor('src/routes/hmr-switch/server.tsx')
      editor.edit((s) => `"use client";\n` + s)
      await expect(page.getByTestId('test-hmr-switch-server')).toContainText(
        '(useState: true)',
      )

      await page.waitForTimeout(100)
      editor.reset()
      await expect(page.getByTestId('test-hmr-switch-server')).toContainText(
        '(useState: false)',
      )
    })

    test('hmr switch client to server', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)

      await expect(page.getByTestId('test-hmr-switch-client')).toContainText(
        '(useState: true)',
      )
      const editor = f.createEditor('src/routes/hmr-switch/client.tsx')
      editor.edit((s) => s.replace(`'use client'`, ''))
      await expect(page.getByTestId('test-hmr-switch-client')).toContainText(
        '(useState: false)',
      )

      await page.waitForTimeout(100)
      editor.reset()
      await expect(page.getByTestId('test-hmr-switch-client')).toContainText(
        '(useState: true)',
      )
    })
  })

  test('css @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await testCss(page)
    await expect(page.locator('.test-dep-css-in-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(page.locator('.test-style-server-manual')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  testNoJs('css @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testCss(page)
    await expect(page.locator('.test-dep-css-in-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(page.locator('.test-style-server-manual')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  async function testCss(page: Page, color = 'rgb(255, 165, 0)') {
    await expect(page.locator('.test-style-client')).toHaveCSS('color', color)
    await expect(page.locator('.test-style-server')).toHaveCSS('color', color)
  }

  test.describe(() => {
    test.skip(f.mode !== 'dev')

    test('css hmr client', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)

      await using _ = await expectNoReload(page)
      const editor = f.createEditor('src/routes/style-client/client.css')
      editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
      await expect(page.locator('.test-style-client')).toHaveCSS(
        'color',
        'rgb(0, 165, 255)',
      )
      editor.edit((s) =>
        s.replaceAll(
          `color: rgb(0, 165, 255);`,
          `/* color: rgb(0, 165, 255); */`,
        ),
      )
      await expect(page.locator('.test-style-client')).toHaveCSS(
        'color',
        'rgb(0, 0, 0)',
      )
      // wait longer for multiple edits
      await page.waitForTimeout(100)
      editor.reset()
      await expect(page.locator('.test-style-client')).toHaveCSS(
        'color',
        'rgb(255, 165, 0)',
      )
      await expectNoDuplicateServerCss(page)
    })

    async function expectNoDuplicateServerCss(page: Page) {
      // check only manually inserted stylesheet link exists
      // (toHaveAttribute passes only when locator matches single element)
      await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute(
        'href',
        '/test-style-server-manual.css',
      )
    }

    test('no duplicate server css', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await expectNoDuplicateServerCss(page)
    })

    test('adding/removing css client @js', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await testAddRemoveCssClient(page, { js: true })
    })

    testNoJs('adding/removing css client @nojs', async ({ page }) => {
      await page.goto(f.url())
      await testAddRemoveCssClient(page, { js: false })
    })

    async function testAddRemoveCssClient(
      page: Page,
      options: { js: boolean },
    ) {
      await expect(page.locator('.test-style-client-dep')).toHaveCSS(
        'color',
        'rgb(255, 165, 0)',
      )

      // remove css import
      const editor = f.createEditor('src/routes/style-client/client-dep.tsx')
      editor.edit((s) =>
        s.replaceAll(
          `import './client-dep.css'`,
          `/* import './client-dep.css' */`,
        ),
      )
      await page.waitForTimeout(100)
      await expect(async () => {
        if (!options.js) await page.reload()
        await expect(page.locator('.test-style-client-dep')).toHaveCSS(
          'color',
          'rgb(0, 0, 0)',
          { timeout: 10 },
        )
      }).toPass()

      // add back css import
      editor.reset()
      await page.waitForTimeout(100)
      await expect(async () => {
        if (!options.js) await page.reload()
        await expect(page.locator('.test-style-client-dep')).toHaveCSS(
          'color',
          'rgb(255, 165, 0)',
          { timeout: 10 },
        )
      }).toPass()
    }

    test('css hmr server', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)

      await using _ = await expectNoReload(page)
      const editor = f.createEditor('src/routes/style-server/server.css')
      editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
      await expect(page.locator('.test-style-server')).toHaveCSS(
        'color',
        'rgb(0, 165, 255)',
      )
      editor.edit((s) =>
        s.replaceAll(
          `color: rgb(0, 165, 255);`,
          `/* color: rgb(0, 165, 255); */`,
        ),
      )
      await expect(page.locator('.test-style-server')).toHaveCSS(
        'color',
        'rgb(0, 0, 0)',
      )
      editor.reset()
      await expect(page.locator('.test-style-server')).toHaveCSS(
        'color',
        'rgb(255, 165, 0)',
      )
      await expect(page.locator('.test-style-server-manual')).toHaveCSS(
        'color',
        'rgb(255, 165, 0)',
      )
      await expectNoDuplicateServerCss(page)
    })

    // TODO: need a way to add/remove links on server hmr. for now, it requires a manually reload.
    test.skip('adding/removing css server @js', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await testAddRemoveCssServer(page, { js: true })
    })

    testNoJs('adding/removing css server @nojs', async ({ page }) => {
      await page.goto(f.url())
      await testAddRemoveCssServer(page, { js: false })
    })

    async function testAddRemoveCssServer(
      page: Page,
      options: { js: boolean },
    ) {
      await expect(page.locator('.test-style-server')).toHaveCSS(
        'color',
        'rgb(255, 165, 0)',
      )

      // remove css import
      const editor = f.createEditor('src/routes/style-server/server.tsx')
      editor.edit((s) =>
        s.replaceAll(`import './server.css'`, `/* import './server.css' */`),
      )
      await page.waitForTimeout(100)
      await expect(async () => {
        if (!options.js) await page.reload()
        await expect(page.locator('.test-style-server')).toHaveCSS(
          'color',
          'rgb(0, 0, 0)',
          { timeout: 10 },
        )
      }).toPass()

      // add back css import
      editor.reset()
      await page.waitForTimeout(100)
      await expect(async () => {
        if (!options.js) await page.reload()
        await expect(page.locator('.test-style-server')).toHaveCSS(
          'color',
          'rgb(255, 165, 0)',
          { timeout: 10 },
        )
      }).toPass()
    }
  })

  test('css client no ssr', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await page.locator("a[href='?test-client-style-no-ssr']").click()
    await expect(page.locator('.test-style-client-no-ssr')).toHaveCSS(
      'color',
      'rgb(0, 200, 100)',
    )
  })

  test('css module client @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('css-module-client')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )

    if (f.mode !== 'dev') return

    // test client css module HMR
    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/routes/style-client/client.module.css')
    editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
    await expect(page.getByTestId('css-module-client')).toHaveCSS(
      'color',
      'rgb(0, 165, 255)',
    )
    editor.reset()
    await expect(page.getByTestId('css-module-client')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  test('css module server @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('css-module-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )

    if (f.mode !== 'dev') return

    // test server css module HMR
    await using _ = await expectNoReload(page)
    const editor = f.createEditor('src/routes/style-server/server.module.css')
    editor.edit((s) => s.replaceAll('rgb(255, 165, 0)', 'rgb(0, 165, 255)'))
    await expect(page.getByTestId('css-module-server')).toHaveCSS(
      'color',
      'rgb(0, 165, 255)',
    )
    editor.reset()
    await expect(page.getByTestId('css-module-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  testNoJs('css module @nojs', async ({ page }) => {
    await page.goto(f.url())
    await expect(page.getByTestId('css-module-client')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
    await expect(page.getByTestId('css-module-server')).toHaveCSS(
      'color',
      'rgb(255, 165, 0)',
    )
  })

  test('tailwind @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await testTailwind(page)
  })

  testNoJs('tailwind @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testTailwind(page)
  })

  async function testTailwind(page: Page) {
    await expect(page.locator('.test-tw-client')).toHaveCSS(
      'color',
      // blue-500
      'rgb(0, 0, 255)',
    )
    await expect(page.locator('.test-tw-server')).toHaveCSS(
      'color',
      // red-500
      'rgb(255, 0, 0)',
    )
  }

  test.describe(() => {
    test.skip(f.mode !== 'dev')

    test('tailwind hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await testTailwind(page)

      await using _ = await expectNoReload(page)

      const clientFile = f.createEditor('src/routes/tailwind/client.tsx')
      clientFile.edit((s) => s.replaceAll('text-[#00f]', 'text-[#88f]'))
      await expect(page.locator('.test-tw-client')).toHaveCSS(
        'color',
        'rgb(136, 136, 255)',
      )
      clientFile.reset()
      await expect(page.locator('.test-tw-client')).toHaveCSS(
        'color',
        'rgb(0, 0, 255)',
      )

      const serverFile = f.createEditor('src/routes/tailwind/server.tsx')
      serverFile.edit((s) => s.replaceAll('text-[#f00]', 'text-[#f88]'))
      await expect(page.locator('.test-tw-server')).toHaveCSS(
        'color',
        'rgb(255, 136, 136)',
      )
      serverFile.reset()
      await expect(page.locator('.test-tw-server')).toHaveCSS(
        'color',
        'rgb(255, 0, 0)',
      )
    })

    test('tailwind no redundant server hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      const logs: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'log') {
          logs.push(msg.text())
        }
      })
      f.createEditor('src/routes/tailwind/unused.tsx').resave()
      await page.waitForTimeout(200)
      f.createEditor('src/routes/tailwind/server.tsx').resave()
      await page.waitForTimeout(200)
      expect(logs).toEqual([
        expect.stringMatching(/\[vite-rsc:update\].*\/tailwind\/server.tsx/),
      ])
    })
  })

  test('temporary references @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'test-temporary-reference' }).click()
    await expect(page.getByTestId('temporary-reference')).toContainText(
      'result: [server [client]]',
    )
  })

  test('server action error @js', async ({ page }) => {
    // it doesn't seem possible to assert react error stack mapping on playwright.
    // this need to be verified manually on browser devtools console.
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'test-server-action-error' }).click()
    await expect(page.getByText('ErrorBoundary caught')).toBeVisible()
    await page.getByRole('button', { name: 'reset-error' }).click()
    await expect(
      page.getByRole('button', { name: 'test-server-action-error' }),
    ).toBeVisible()
  })

  test('hydrate while streaming @js', async ({ page }) => {
    // client is interactive before suspense is resolved
    await page.goto(f.url('./?test-suspense=1000'), { waitUntil: 'commit' })
    await waitForHydration(page)
    await expect(page.getByTestId('suspense')).toContainText(
      'suspense-fallback',
    )
    await expect(page.getByTestId('suspense')).toContainText(
      'suspense-resolved',
    )
  })

  test('ssr rsc payload encoding', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('ssr-rsc-payload')).toHaveText(
      'test1: true, test2: true, test3: false, test4: true',
    )

    await page.goto(f.url('./?test-payload-binary'))
    await waitForHydration(page)
    await expect(page.getByTestId('ssr-rsc-payload')).toHaveText(
      'test1: true, test2: true, test3: true, test4: true',
    )
  })

  test('action bind simple @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testActionBindSimple(page)
  })

  testNoJs('action bind simple @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindSimple(page)
  })

  async function testActionBindSimple(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-simple')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-simple' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-simple')).toHaveText(
      'true',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }

  test('action bind client @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testActionBindClient(page)
  })

  // this doesn't work on Next either https://github.com/hi-ogawa/reproductions/tree/main/next-rsc-client-action-bind
  testNoJs.skip('action bind client @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindClient(page)
  })

  async function testActionBindClient(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-client')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-client' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-client')).toHaveText(
      'true',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }

  test('action bind action @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await testActionBindAction(page)
  })

  testNoJs('action bind action @nojs', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindAction(page)
  })

  async function testActionBindAction(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-action')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-action' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-action')).toHaveText(
      '[true,true]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }

  test('test serialization @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('serialization')).toHaveText('?')
    await page.getByTestId('serialization').click()
    await expect(page.getByTestId('serialization')).toHaveText('ok')
  })

  test('client-in-server package', async ({ page }) => {
    await page.goto(f.url())
    await expect(page.getByTestId('client-in-server')).toHaveText(
      '[test-client-in-server-dep: true]',
    )
    await expect(page.getByTestId('provider-in-server')).toHaveText(
      '[test-provider-in-server-dep: true]',
    )
  })

  test('server-in-server package', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('server-in-server')).toHaveText(
      'server-in-server: 0',
    )
    await page.getByTestId('server-in-server').click()
    await expect(page.getByTestId('server-in-server')).toHaveText(
      'server-in-server: 1',
    )
    await page.reload()
    await expect(page.getByTestId('server-in-server')).toHaveText(
      'server-in-server: 1',
    )
  })

  test('server-in-client package', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('server-in-client')).toHaveText(
      'server-in-client: ?',
    )
    await page.getByTestId('server-in-client').click()
    await expect(page.getByTestId('server-in-client')).toHaveText(
      'server-in-client: 1',
    )
    await page.reload()
    await waitForHydration(page)
    await expect(page.getByTestId('server-in-client')).toHaveText(
      'server-in-client: ?',
    )
    await page.getByTestId('server-in-client').click()
    await expect(page.getByTestId('server-in-client')).toHaveText(
      'server-in-client: 2',
    )
  })

  test('transitive cjs dep', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByTestId('transitive-cjs-client')).toHaveText('ok')
    await expect(
      page.getByTestId('transitive-use-sync-external-store-client'),
    ).toHaveText('ok:browser')
  })

  test('use cache function', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-fn')
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 0, cacheFnCount: 0)',
    )
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 1, cacheFnCount: 1)',
    )
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 2, cacheFnCount: 1)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 3, cacheFnCount: 2)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 4, cacheFnCount: 2)',
    )

    // revalidate cache
    await locator.getByRole('textbox').fill('revalidate')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 5, cacheFnCount: 3)',
    )
    await locator.getByRole('textbox').fill('test')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 6, cacheFnCount: 4)',
    )
  })

  test('use cache component', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const static1 = await page
      .getByTestId('test-use-cache-component-static')
      .textContent()
    const dynamic1 = await page
      .getByTestId('test-use-cache-component-dynamic')
      .textContent()
    await page.waitForTimeout(100)
    await page.reload()
    const static2 = await page
      .getByTestId('test-use-cache-component-static')
      .textContent()
    const dynamic2 = await page
      .getByTestId('test-use-cache-component-dynamic')
      .textContent()
    expect({ static2, dynamic2 }).toEqual({
      static2: expect.stringMatching(static1!),
      dynamic2: expect.not.stringMatching(dynamic1!),
    })
  })

  test('use cache closure', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    const locator = page.getByTestId('test-use-cache-closure')
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 0, innerFnCount: 0)',
    )

    // (x, y)
    await locator.getByPlaceholder('outer').fill('x')
    await locator.getByPlaceholder('inner').fill('y')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 1, innerFnCount: 1)',
    )

    // (x, y)
    await locator.getByPlaceholder('outer').fill('x')
    await locator.getByPlaceholder('inner').fill('y')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 2, innerFnCount: 1)',
    )

    // (xx, y)
    await locator.getByPlaceholder('outer').fill('xx')
    await locator.getByPlaceholder('inner').fill('y')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 3, innerFnCount: 2)',
    )

    // (xx, y)
    await locator.getByPlaceholder('outer').fill('xx')
    await locator.getByPlaceholder('inner').fill('y')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 4, innerFnCount: 2)',
    )

    // (xx, yy)
    await locator.getByPlaceholder('outer').fill('xx')
    await locator.getByPlaceholder('inner').fill('yy')
    await locator.getByRole('button').click()
    await expect(locator.locator('span')).toHaveText(
      '(actionCount: 5, innerFnCount: 3)',
    )
  })

  test('hydration mismatch', async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', (error) => {
      errors.push(error)
    })
    await page.goto(f.url('/?test-hydration-mismatch'))
    await waitForHydration(page)
    expect(errors).toMatchObject([
      {
        message: expect.stringContaining(
          f.mode === 'dev' ? `Hydration failed` : `Minified React error #418`,
        ),
      },
    ])

    errors.length = 0
    await page.goto(f.url())
    await waitForHydration(page)
    expect(errors).toEqual([])
  })

  test('browser only', async ({ page, browser }) => {
    await page.goto(f.url())
    await expect(page.getByTestId('test-browser-only')).toHaveText(
      'test-browser-only: true',
    )

    const pageNoJs = await browser.newPage({ javaScriptEnabled: false })
    await pageNoJs.goto(f.url())
    await expect(pageNoJs.getByTestId('test-browser-only')).toHaveText(
      'test-browser-only: loading...',
    )
  })

  test('React.cache', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('link', { name: 'test-react-cache' }).click()
    await expect(page.getByTestId('test-react-cache-result')).toHaveText(
      '(cacheFnCount = 2, nonCacheFnCount = 3)',
    )
    await page.reload()
    await expect(page.getByTestId('test-react-cache-result')).toHaveText(
      '(cacheFnCount = 4, nonCacheFnCount = 6)',
    )
  })

  test('css queries', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)

    const tests = [
      ['.test-css-url-client', 'rgb(255, 100, 0)'],
      ['.test-css-inline-client', 'rgb(255, 50, 0)'],
      ['.test-css-raw-client', 'rgb(255, 0, 0)'],
      ['.test-css-url-server', 'rgb(0, 255, 100)'],
      ['.test-css-inline-server', 'rgb(0, 255, 50)'],
      ['.test-css-raw-server', 'rgb(0, 255, 0)'],
    ] as const

    // css with queries are not injected automatically
    for (const [selector] of tests) {
      await expect(page.locator(selector)).toHaveCSS('color', 'rgb(0, 0, 0)')
    }

    // inject css manually
    await page.getByRole('button', { name: 'test-css-queries' }).click()

    // verify styles
    for (const [selector, color] of tests) {
      await expect(page.locator(selector)).toHaveCSS('color', color)
    }
  })

  test('assets', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(
      page.getByTestId('test-assets-server-import'),
    ).not.toHaveJSProperty('naturalWidth', 0)
    await expect(
      page.getByTestId('test-assets-client-import'),
    ).not.toHaveJSProperty('naturalWidth', 0)

    async function testBackgroundImage(selector: string) {
      const url = await page
        .locator(selector)
        .evaluate((el) => getComputedStyle(el).backgroundImage)
      expect(url).toMatch(/^url\(.*\)$/)
      const response = await page.request.get(url.slice(5, -2))
      expect(response.ok()).toBeTruthy()
      expect(response.headers()['content-type']).toBe('image/svg+xml')
    }

    await testBackgroundImage('.test-assets-server-css')
    await testBackgroundImage('.test-assets-client-css')
  })
}
