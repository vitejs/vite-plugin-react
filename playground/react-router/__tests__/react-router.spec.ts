import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
  browserErrors,
  editFile,
  isBuild,
  isServe,
  page,
  testDir,
  untilBrowserLogAfter,
  viteServer,
  viteTestUrl,
} from '~utils'

test('should render', async () => {
  await untilBrowserLogAfter(() => page.goto(viteTestUrl), 'hydrated')
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
  expect(browserErrors).toEqual([])
})

test.runIf(isServe)('should compile without Fast Refresh', async () => {
  const result = await viteServer.environments.client.transformRequest(
    '/app/routes/home.tsx',
  )
  const code = result!.code
  expect(code).toMatch(/_c\(\d+\)/)
  expect(code).toContain('jsx-dev-runtime')
  // Fast Refresh is only set up by React Router
  expect(code).not.toContain('/@react-refresh')
  expect(code.match(/import RefreshRuntime from/g)).toEqual([
    'import RefreshRuntime from',
  ])
  expect(code).toContain('virtual:react-router/hmr-runtime')
})

test.runIf(isServe)('should preserve state on edit', async () => {
  expect(await page.textContent('button')).toMatch('count is 1')
  editFile('app/routes/home.tsx', (code) =>
    code.replace('count is {count}', 'count is {count}!'),
  )
  await expect.poll(() => page.textContent('button')).toMatch('count is 1!')
  expect(browserErrors).toEqual([])
})

test.runIf(isBuild)('should compile components', () => {
  const assetsDir = path.join(testDir, 'build/client/assets')
  const bundle = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(assetsDir, file), 'utf-8'))
    .join('\n')
  expect(bundle).toContain('react.memo_cache_sentinel')
})
