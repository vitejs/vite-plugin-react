import { useFixture } from './fixture'
import { defineStarterTest } from './starter'
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Webkit fails by
// > TypeError: ReadableByteStreamController is not implemented
test.skip(({ browserName }) => browserName === 'webkit')

test.describe('dev-browser', () => {
  const f = useFixture({ root: 'examples/browser', mode: 'dev' })
  defineStarterTest(f, 'no-ssr')
})

test.describe('build-browser', () => {
  const f = useFixture({ root: 'examples/browser', mode: 'build' })
  defineStarterTest(f, 'no-ssr')

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})
