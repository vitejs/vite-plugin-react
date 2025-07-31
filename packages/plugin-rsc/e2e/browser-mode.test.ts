import { test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('dev-browser-mode', () => {
  // Webkit fails by
  // > TypeError: ReadableByteStreamController is not implemented
  test.skip((ctx) => ctx.browserName === 'webkit')

  const f = useFixture({ root: 'examples/browser-mode', mode: 'dev' })
  defineStarterTest(f, 'browser-mode')
})
