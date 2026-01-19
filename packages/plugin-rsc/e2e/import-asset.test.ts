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
        // Remove "index" client entry to test importAsset replacing the convention
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import baseConfig from './vite.config.base.ts'
          delete baseConfig.environments.client.build.rollupOptions.input;
          export default baseConfig;
        `,
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
