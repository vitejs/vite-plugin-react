import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('viteRsc.import', () => {
  const root = 'examples/e2e/temp/import-environment'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/framework/entry.rsc.tsx': {
          edit: (s) =>
            s.replace(
              `\
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
`,
              `\
  const ssrEntryModule = await import.meta.viteRsc.import<
    typeof import('./entry.ssr.tsx')
  >('./entry.ssr.tsx', { environment: 'ssr' })
`,
            ),
        },
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import baseConfig from './vite.config.base.ts'
          delete baseConfig.environments.ssr.build.rollupOptions.input;
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
