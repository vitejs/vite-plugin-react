import path from 'node:path'
import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import {
  getBundledReactServerDomBuilds,
  getOptimizedReactServerDomBuilds,
  waitForHydration,
} from './helper'
import { defineStarterTest } from './starter'

test.describe('dev', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'dev' })
  defineStarterTest(f)

  test('reactServerDomBuild: node pre-bundles node builds', async ({
    page,
  }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    expect(getOptimizedReactServerDomBuilds(f.root, 'rsc')).toEqual([
      'client.node',
      'server.node',
      'static.node',
    ])
    expect(getOptimizedReactServerDomBuilds(f.root, 'ssr')).toEqual([
      'client.node',
    ])
  })
})

test.describe('build', () => {
  const f = useFixture({ root: 'examples/node-stream', mode: 'build' })
  defineStarterTest(f)

  test('reactServerDomBuild: node bundles only node builds', () => {
    expect(
      getBundledReactServerDomBuilds(path.join(f.root, 'dist/rsc')),
    ).toEqual(['server.node'])
    expect(
      getBundledReactServerDomBuilds(path.join(f.root, 'dist/ssr')),
    ).toEqual(['client.node'])
  })
})
