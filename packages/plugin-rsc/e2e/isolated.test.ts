import { test } from '@playwright/test'
import { setupIsolatedFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'
import path from 'node:path'
import os from 'node:os'

test.describe(() => {
  // use RUNNER_TEMP on Github Actions
  // https://github.com/actions/toolkit/issues/518
  const tmpRoot = path.join(
    process.env['RUNNER_TEMP'] || os.tmpdir(),
    'test-vite-rsc',
  )
  test.beforeAll(async () => {
    await setupIsolatedFixture({ src: 'examples/starter', dest: tmpRoot })
  })

  test.describe('dev-isolated', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build-isolated', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})

test.describe('vite 6', () => {
  test.skip(!!process.env.ECOSYSTEM_CI)

  const tmpRoot = path.join(
    process.env['RUNNER_TEMP'] || os.tmpdir(),
    'test-vite-rsc-vite-6',
  )
  test.beforeAll(async () => {
    await setupIsolatedFixture({
      src: 'examples/starter',
      dest: tmpRoot,
      overrides: {
        vite: '^6',
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root: tmpRoot, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root: tmpRoot, mode: 'build' })
    defineStarterTest(f)
  })
})
