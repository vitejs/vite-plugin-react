import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

// `experimental.bundledDev` runs a client Rollup build in dev, which used to
// crash the assets-manifest `generateBundle` hook (no RSC bundle in dev).
test.describe('bundled-dev', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'dev',
    command: 'pnpm dev --experimental-bundle',
  })
  defineStarterTest(f)
})
