import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'dev' })
  defineStarterTest(f)
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'build' })
  defineStarterTest(f)
})
