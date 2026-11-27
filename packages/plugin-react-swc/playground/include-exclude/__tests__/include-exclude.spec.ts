import { expect, test } from '@playwright/test'
import { setupDevServer } from '../../utils.ts'

test('Only files matching `include` and not `exclude` are transformed', async ({
  page,
}) => {
  const { testUrl, server } = await setupDevServer('include-exclude')
  await page.goto(testUrl)
  await expect(page.locator('body')).toHaveText('Hello included')

  const transform = async (url: string) =>
    (await server.transformRequest(url))!.code

  // Fast refresh is applied to files that are not excluded
  expect(await transform('/src/Included.tsx')).toContain('$RefreshReg$')
  // Not matched by `include`
  expect(await transform('/src/NotIncluded.jsx')).not.toContain('$RefreshReg$')
  // Excluded by directory and by extension
  expect(await transform('/src/excluded/Dir.tsx')).not.toContain('$RefreshReg$')
  expect(await transform('/src/Ext.skipped.tsx')).not.toContain('$RefreshReg$')

  await server.close()
})
