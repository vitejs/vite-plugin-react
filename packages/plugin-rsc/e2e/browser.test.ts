import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev-browser', () => {
  const f = useFixture({ root: 'examples/browser', mode: 'dev' })
  defineStarterTest(f, 'no-ssr')
})

test.describe('build-browser', () => {
  const f = useFixture({ root: 'examples/browser', mode: 'build' })
  defineStarterTest(f, 'no-ssr')
})
