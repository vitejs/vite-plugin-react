import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'dev' })
  defineStarterTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'build' })
  defineStarterTest(f)
})
