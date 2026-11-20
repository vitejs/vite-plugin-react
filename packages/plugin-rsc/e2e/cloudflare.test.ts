import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

// Run on a copy so the HMR tests never edit `examples/starter-extra`,
// which other specs copy as their inline fixture base.
const root = 'examples/e2e/temp/cloudflare'

test.beforeAll(async () => {
  await setupInlineFixture({ src: 'examples/starter-extra', dest: root })
})

test.describe('dev-cloudflare', () => {
  const f = useFixture({
    root,
    mode: 'dev',
    command: 'pnpm cf:dev',
  })
  defineStarterTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({
    root,
    mode: 'build',
    buildCommand: 'pnpm cf:build',
    command: 'pnpm cf:preview',
  })
  defineStarterTest(f)

  test('nested ssr output re-exports the rsc assets manifest', async () => {
    const manifestPath = path.join(
      f.root,
      'dist/rsc/__vite_rsc_assets_manifest.js',
    )
    const stubPath = path.join(
      f.root,
      'dist/rsc/ssr/__vite_rsc_assets_manifest.js',
    )
    expect(fs.readFileSync(manifestPath, 'utf-8')).toMatch(/^export default /)
    expect(fs.readFileSync(stubPath, 'utf-8')).toBe(
      'export { default } from "../__vite_rsc_assets_manifest.js"\n',
    )
    const outer = await import(pathToFileURL(manifestPath).href)
    const inner = await import(pathToFileURL(stubPath).href)
    expect(inner.default).toBe(outer.default)
  })
})
