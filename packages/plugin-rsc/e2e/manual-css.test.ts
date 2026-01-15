import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

// Test `rscCssTransform: false` option which disables automatic CSS injection
// and requires manual use of `import.meta.viteRsc.loadCss()`.

test.describe('manual-css', () => {
  const root = 'examples/e2e/temp/manual-css'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        // Disable auto CSS injection
        'vite.config.ts': {
          edit: (s) => s.replace('rsc({', `rsc({ rscCssTransform: false,`),
        },
        // Add manual loadCss() call since auto-injection is disabled
        'src/root.tsx': {
          edit: (s) =>
            s.replace('</head>', `{import.meta.viteRsc.loadCss()}</head>`),
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
