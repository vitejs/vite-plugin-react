import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { editFile, isBuild, isServe, page, testDir, viteServer } from '~utils'

test('should render', async () => {
  expect(await page.textContent('button')).toMatch('count is 0')
  expect(await page.click('button'))
  expect(await page.textContent('button')).toMatch('count is 1')
  expect(await page.textContent('.class-component')).toMatch('ClassComponent')
})

test.runIf(isServe)('should compile components', async () => {
  const result =
    await viteServer.environments.client.transformRequest('/src/App.tsx')
  // The runtime import is rewritten to the pre-bundled dependency path in dev
  expect(result?.code).toMatch(/compiler-runtime/)
  expect(result?.code).toMatch(/_c\(\d+\)/)
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

test.runIf(isServe)('should hmr', async () => {
  editFile('src/App.tsx', (code) =>
    code.replace('count is {count}', 'count is {count}!'),
  )
  await expect.poll(() => page.textContent('button')).toMatch('count is 1!')
})
