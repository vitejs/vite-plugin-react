import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineTest } from './starter'

test.describe('dev-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'dev' })
  defineTest(f)
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'build' })
  defineTest(f)
})

test.describe('dev-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'dev' })
  defineTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'build' })
  defineTest(f)
})
