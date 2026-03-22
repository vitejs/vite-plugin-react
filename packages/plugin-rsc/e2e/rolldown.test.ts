import { test } from '@playwright/test'
import * as vite from 'vite'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('rolldownOptions', () => {
  test.skip(!('rolldownVersion' in vite), 'rolldown only')

  const root = 'examples/e2e/temp/rolldown-options'
  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (s) => s.replace(/rollupOptions/g, 'rolldownOptions'),
        },
      },
    })
  })

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineStarterTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
