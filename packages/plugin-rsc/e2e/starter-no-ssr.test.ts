import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { defineTest } from './starter'
import path from 'node:path'
import fs from 'node:fs'

test.describe('dev-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'dev' })
  defineTest(f, 'no-ssr')
})

test.describe('build-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'build' })
  defineTest(f, 'no-ssr')

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})
