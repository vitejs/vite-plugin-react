import { useFixture } from './fixture'
import { defineStarterTest } from './starter'
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test.describe('dev-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'dev' })
  defineStarterTest(f, 'no-ssr')
})

test.describe('build-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'build' })
  defineStarterTest(f, 'no-ssr')

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})
