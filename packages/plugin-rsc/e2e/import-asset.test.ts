import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('viteRsc.importAsset', () => {
  const root = 'examples/e2e/temp/import-asset'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/framework/entry.ssr.tsx': {
          edit: (s) =>
            s.replace(
              `\
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
`,
              `\
  const asset = await import.meta.viteRsc.importAsset('./entry.browser.tsx', { entry: true })
  const bootstrapScriptContent = \`import(\${JSON.stringify(asset.url)})\`
`,
            ),
        },
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
