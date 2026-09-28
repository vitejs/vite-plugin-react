import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
  editFile,
  isBuild,
  isServe,
  page,
  testDir,
  viteServer,
  viteTestUrl,
} from '~utils'

test('should render', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
})

test.runIf(isServe)('should compile without Fast Refresh', async () => {
  const result =
    await viteServer.environments.client.transformRequest('/src/App.tsx')
  expect(result?.code).toMatch(/_c\(\d+\)/)
  expect(result?.code).toContain('jsx-dev-runtime')
  expect(result?.code).not.toContain('$RefreshReg$')
  expect(result?.code).not.toContain('$RefreshSig$')
  expect(result?.code).not.toContain('/@react-refresh')
})

test.runIf(isServe)('should not inject the preamble', async () => {
  const html = await (await fetch(viteTestUrl)).text()
  expect(html).not.toContain('/@react-refresh')
  expect(html).not.toContain('__vite_plugin_react_preamble_installed__')
})

test.runIf(isServe)('should reload the page on edit', async () => {
  // HMR is still on, but without Fast Refresh there is no boundary to
  // accept the update, so the page reloads and the state is reset.
  editFile('src/App.tsx', (code) =>
    code.replace('count is {count}', 'count is {count}!'),
  )
  await expect.poll(() => page.textContent('button')).toMatch('count is 0!')
})

test.runIf(isBuild)('should compile components', () => {
  const assetsDir = path.join(testDir, 'dist/assets')
  const bundle = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(assetsDir, file), 'utf-8'))
    .join('\n')
  expect(bundle).toContain('react.memo_cache_sentinel')
})
