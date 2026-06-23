import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'

test.describe('custom client entry preload priority', () => {
  const root = 'examples/e2e/temp/preload-priority-custom-entry'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (source) =>
            source.replace('rsc()', 'rsc({ customClientEntry: true })'),
        },
        'src/framework/entry.ssr.tsx': {
          edit: (source) =>
            source.replace(
              `  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')`,
              `  const bootstrapScriptContent = undefined`,
            ),
        },
      },
    })
  })

  const f = useFixture({ root, mode: 'build' })

  test('leaves framework-managed entry dependencies unclassified', () => {
    const manifest = JSON.parse(
      fs
        .readFileSync(
          f.root + '/dist/ssr/__vite_rsc_assets_manifest.js',
          'utf-8',
        )
        .slice('export default '.length),
    )

    expect(manifest.clientEntryDeps).toBeUndefined()
    expect(Object.keys(manifest.clientReferenceDeps).length).toBeGreaterThan(0)
    expect(
      Object.values(manifest.clientReferenceDeps).some(
        (deps) => (deps as { js: string[] }).js.length > 0,
      ),
    ).toBe(true)
  })
})
