import { useFixture } from './fixture'
import { defineStarterTest } from './starter'
import { test } from '@playwright/test'

test.describe('dev-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'dev' })
  defineStarterTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'build' })
  defineStarterTest(f)
})
