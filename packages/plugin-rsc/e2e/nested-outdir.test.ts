import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/nested-outDir'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
import baseConfig from './vite.config.base.ts'

// Modify baseConfig to use nested outDir (rsc inside ssr)
baseConfig.environments.rsc.build.outDir = './dist/server/rsc'
baseConfig.environments.ssr.build.outDir = './dist/server'

export default baseConfig
`,
      },
    })
  })

  test.describe('build-nested-outDir', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('verify nested outDir structure', () => {
      // RSC output exists inside SSR outDir
      expect(fs.existsSync(path.join(f.root, 'dist/server/rsc/index.js'))).toBe(
        true,
      )
      expect(
        fs.existsSync(
          path.join(f.root, 'dist/server/rsc/__vite_rsc_assets_manifest.js'),
        ),
      ).toBe(true)
      // SSR output exists
      expect(fs.existsSync(path.join(f.root, 'dist/server/index.js'))).toBe(
        true,
      )
      expect(
        fs.existsSync(
          path.join(f.root, 'dist/server/__vite_rsc_assets_manifest.js'),
        ),
      ).toBe(true)
    })
  })
})
