import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe('build', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'build',
  })

  test('executes a retained action through /a', async ({ page }) => {
    // The production manifest redispatches the /b request through /a.
    await page.goto(f.url('/a'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Save action A' }).click()
    await page.getByRole('link', { name: '/b' }).click()
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Run saved action' }),
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Run saved action' }).click()
    await expect(
      page.getByText('Result: ACTION_A_OK:MIDDLEWARE_A'),
    ).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })

  test('emits filtered route deployments', () => {
    const outDir = path.join(f.root, 'dist/rsc')
    const manifestSource = fs.readFileSync(
      path.join(outDir, '__route_action_manifest.js'),
      'utf-8',
    )
    const manifest: Record<string, string[]> = JSON.parse(
      manifestSource.slice('export default '.length),
    )

    for (const [route, includedResult, excludedResult] of [
      ['/a', 'ACTION_A_OK', 'ACTION_B_OK'],
      ['/b', 'ACTION_B_OK', 'ACTION_A_OK'],
    ] as const) {
      const deploymentDir = path.join(
        outDir,
        'deployments',
        route.slice(1),
        'rsc',
      )
      const registry = fs.readFileSync(
        path.join(deploymentDir, '__server_references.js'),
        'utf-8',
      )
      const referenceKeys = [...registry.matchAll(/^\s*"([^"]+)":/gm)].map(
        (match) => match[1],
      )
      expect(referenceKeys).toEqual(
        manifest[route]!.map((actionId) => actionId.split('#')[0]),
      )

      const code = [
        fs.readFileSync(path.join(deploymentDir, 'handler.js'), 'utf-8'),
        ...fs
          .readdirSync(path.join(deploymentDir, 'assets'))
          .filter((fileName) => fileName.endsWith('.js'))
          .map((fileName) =>
            fs.readFileSync(
              path.join(deploymentDir, 'assets', fileName),
              'utf-8',
            ),
          ),
      ].join('\n')
      expect(code).toContain(includedResult)
      expect(code).not.toContain(excludedResult)
      expect(code).not.toContain('virtual:vite-rsc/server-references')
    }
  })
})

test.describe('dev', () => {
  const f = useFixture({
    root: 'examples/action-reachability',
    mode: 'dev',
  })

  test('executes a retained action through /b', async ({ page }) => {
    // Development has no route manifest, so the same request stays on /b.
    await page.goto(f.url('/a'))
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Save action A' }).click()
    await page.getByRole('link', { name: '/b' }).click()
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Run saved action' }),
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Run saved action' }).click()
    await expect(
      page.getByText('Result: ACTION_A_OK:MIDDLEWARE_B'),
    ).toBeVisible()
    await expect(page).toHaveURL(f.url('/b'))
    await expect(
      page.getByRole('heading', { name: 'This is page "b"' }),
    ).toBeVisible()
  })
})
