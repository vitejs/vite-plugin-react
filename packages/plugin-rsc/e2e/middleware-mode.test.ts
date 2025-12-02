import { test } from '@playwright/test'

import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/middleware-mode'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
    })
  })

  test.describe('dev-middleware-mode', () => {
    const f = useFixture({
      root,
      mode: 'dev',
      command: 'node ../../middleware-mode.ts dev',
    })
    defineStarterTest(f)
  })

  test.describe('build-middleware-mode', () => {
    const f = useFixture({
      root,
      mode: 'build',
      command: 'node ../../middleware-mode.ts start',
      cliOptions: {
        env: {
          NODE_ENV: 'production',
        },
      },
    })
    defineStarterTest(f)
  })
})
