import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture, type Fixture } from './fixture'
import { defineStarterTest } from './starter'
import { expectNoPageError, waitForHydration } from './helper'
import { x } from 'tinyexec'

test.describe('dev-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'dev' })
  defineStarterTest(f)
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'build' })
  defineStarterTest(f)
})

test.describe('dev-production', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'dev',
    cliOptions: {
      env: { NODE_ENV: 'production' },
    },
  })
  defineStarterTest(f, 'dev-production')

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
  defineStarterTest(f)

  test('verify development', async ({ page }) => {
    let output!: string
    page.on('response', async (response) => {
      if (response.url().match(/\/assets\/entry.rsc-[\w-]+\.js$/)) {
        output = await response.text()
      }
    })
    await page.goto(f.url())
    await waitForHydration(page)
    expect(output).toContain('jsxDEV')
  })
})

test.describe('duplicate loadCss', () => {
  const root = 'examples/e2e/temp/duplicate-load-css'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/root.tsx': {
          edit: (s) =>
            s.replace(
              '</head>',
              () =>
                `\
{import.meta.viteRsc.loadCss()}
{import.meta.viteRsc.loadCss()}
</head>`,
            ),
        },
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest(f)
  })

  function defineTest(f: Fixture) {
    test('basic', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
    })
  }
})

test.describe('isolated build', () => {
  const root = 'examples/e2e/temp/isolated-build'

  test.beforeAll(async () => {
    // build twice programmatically to verify two plugin states are independent
    async function testFn() {
      const vite = await import('vite')
      const fs = await import('node:fs')

      console.log('======== first build ========')
      const builder1 = await vite.createBuilder()
      await builder1.buildApp()

      // edit files to remove client references
      fs.rmSync(`src/client.tsx`)
      fs.writeFileSync(
        `src/root.tsx`,
        fs
          .readFileSync(`src/root.tsx`, 'utf-8')
          .replace(`import { ClientCounter } from './client.tsx'`, '')
          .replace(`<ClientCounter />`, ''),
      )

      console.log('======== second build ========')
      const builder2 = await vite.createBuilder()
      await builder2.buildApp()
    }

    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'test.js': `await (${testFn.toString()})();\n`,
      },
    })
  })

  test('build', async () => {
    const result = await x('node', ['./test.js'], {
      nodeOptions: { cwd: root },
    })
    expect(result.stderr).not.toContain('Build failed')
    expect(result.exitCode).toBe(0)
  })
})
