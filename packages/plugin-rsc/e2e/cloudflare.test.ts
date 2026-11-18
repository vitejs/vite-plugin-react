import fs from 'node:fs'
import path from 'node:path'
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

  test('nested ssr output imports the rsc assets manifest', () => {
    const rscOutDir = path.join(f.root, 'dist/rsc')
    const manifestPath = path.join(rscOutDir, '__vite_rsc_assets_manifest.js')
    expect(fs.existsSync(manifestPath)).toBe(true)
    expect(
      fs.existsSync(path.join(rscOutDir, 'ssr/__vite_rsc_assets_manifest.js')),
    ).toBe(false)

    const ssrOutDir = path.join(rscOutDir, 'ssr')
    const imports = fs
      .readdirSync(ssrOutDir, { recursive: true, encoding: 'utf-8' })
      .filter((file) => file.endsWith('.js'))
      .flatMap((file) => {
        const code = fs.readFileSync(path.join(ssrOutDir, file), 'utf-8')
        return [
          ...code.matchAll(/["']([^"']*__vite_rsc_assets_manifest\.js)["']/g),
        ].map((match) => path.resolve(ssrOutDir, file, '..', match[1]!))
      })
    expect(imports.length).toBeGreaterThan(0)
    expect(new Set(imports)).toEqual(new Set([manifestPath]))
  })
})
