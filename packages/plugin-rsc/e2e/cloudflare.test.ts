import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev-cloudflare', () => {
  const f = useFixture({
    root: 'examples/starter-extra',
    mode: 'dev',
    command: 'pnpm cf:dev',
  })
  defineStarterTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({
    root: 'examples/starter-extra',
    mode: 'build',
    buildCommand: 'pnpm cf:build',
    command: 'pnpm cf:preview',
  })
  defineStarterTest(f)
})
