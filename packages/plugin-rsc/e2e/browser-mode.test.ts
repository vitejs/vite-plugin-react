import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev-browser-mode', () => {
  const f = useFixture({ root: 'examples/browser-mode', mode: 'dev' })
  defineStarterTest(f, 'browser-mode')
})
