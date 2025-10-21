import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'
import path from 'node:path'
import fs from 'node:fs'

// Webkit fails by
// > TypeError: ReadableByteStreamController is not implemented
test.skip(({ browserName }) => browserName === 'webkit')

test.describe('dev-browser-mode2', () => {
  const f = useFixture({ root: 'examples/browser-mode2', mode: 'dev' })
  defineStarterTest(f, 'browser-mode')
})

test.describe('build-browser-mode2', () => {
  const f = useFixture({ root: 'examples/browser-mode2', mode: 'build' })
  defineStarterTest(f, 'browser-mode')

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})
