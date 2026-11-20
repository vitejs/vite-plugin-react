import { test } from '@playwright/test'
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
})
