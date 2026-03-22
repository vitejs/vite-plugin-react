import fs from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/root'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import baseConfig from './vite.config.base.ts'
          import path from "node:path";
          baseConfig.root = "./custom-root";
          for (const e of Object.values(baseConfig.environments)) {
            e.build.rollupOptions.input.index = path.resolve(
              'custom-root',
              e.build.rollupOptions.input.index,
          );
          }
          export default baseConfig;
        `,
      },
    })
    fs.mkdirSync(`${root}/custom-root`, { recursive: true })
    fs.renameSync(`${root}/src`, `${root}/custom-root/src`)
    fs.renameSync(`${root}/public`, `${root}/custom-root/public`)
  })

  test.describe('dev-root', () => {
    const f = useFixture({ root, mode: 'dev' })
    const oldCreateEditor = f.createEditor
    f.createEditor = (filePath: string) =>
      oldCreateEditor(path.resolve(root, 'custom-root', filePath))
    defineStarterTest(f)
  })

  test.describe('build-root', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})

// Test that the RSC plugin works when `root` is passed as a CLI argument
// e.g. `vite dev ./app` where the app lives in a subdirectory.
// This effectively tests `createServer/createBuilder({ root })`
// and then loading config file from the specified root.
test.describe('root-config', () => {
  const root = 'examples/e2e/temp/root-config'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: `${root}/app`,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import baseConfig from './vite.config.base.ts'
          import path from "node:path";
          for (const e of Object.values(baseConfig.environments)) {
            e.build.rollupOptions.input.index = path.resolve(
              'app',
              e.build.rollupOptions.input.index,
            );
          }
          export default baseConfig;
        `,
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev', command: 'vite dev ./app' })
    const oldCreateEditor = f.createEditor
    f.createEditor = (filePath: string) =>
      oldCreateEditor(path.resolve(root, 'app', filePath))
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({
      root,
      mode: 'build',
      buildCommand: 'vite build ./app',
      command: 'vite preview ./app',
    })
    defineStarterTest(f)
  })
})
