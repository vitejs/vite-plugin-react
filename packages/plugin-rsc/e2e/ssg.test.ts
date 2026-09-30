import { expect, test } from '@playwright/test'
import { type Fixture, setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/ssg',
    mode: 'dev',
  })
  defineTestSsg(f)
})

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/ssg',
    mode: 'build',
  })
  defineTestSsg(f)
})

// pre-render from ssr `writeBundle` (before plugin-rsc's `buildApp` finishes),
// which requires the assets manifest to be written before that,
// then remove the ssr output, which plugin-rsc must not write into afterwards.
// e.g. Vike pre-renders this way and, once every page is pre-rendered,
// removes the ssr output.
test.describe('build-prerender-ssr-writeBundle', () => {
  const root = 'examples/e2e/temp/ssg-ssr-writeBundle'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/ssg',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (s) => {
            const before = `\
      buildApp: {
        async handler(builder) {
          await renderStatic(builder.config)
        },
      },
`
            const after = `\
      writeBundle: {
        async handler() {
          if (this.environment.name === 'ssr') {
            await renderStatic(this.environment.getTopLevelConfig())
            fs.rmSync(this.environment.config.build.outDir, { recursive: true })
          }
        },
      },
`
            if (!s.includes(before)) throw new Error('failed to edit')
            return s.replace(before, after)
          },
        },
      },
    })
  })

  const f = useFixture({ root, mode: 'build' })
  defineTestSsg(f)
})

function defineTestSsg(f: Fixture) {
  test('basic', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)

    if (f.mode === 'build') {
      const t1 = await page.getByTestId('timestamp').textContent()
      await page.waitForTimeout(100)
      await page.reload()
      await waitForHydration(page)
      const t2 = await page.getByTestId('timestamp').textContent()
      expect(t2).toBe(t1)
    }
  })
}
