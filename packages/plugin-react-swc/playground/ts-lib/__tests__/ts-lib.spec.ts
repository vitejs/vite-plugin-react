import { type Page, expect, test } from '@playwright/test'

import { setupBuildAndPreview, setupDevServer } from '../../utils.ts'

test('TS lib build', async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview('ts-lib')
  await page.goto(testUrl)
  await testNonJs(page)
  await server.httpServer.close()
})

test('TS lib dev', async ({ page }) => {
  const { testUrl, server } = await setupDevServer('ts-lib')
  await page.goto(testUrl)
  await testNonJs(page)
  await server.close()
})

async function testNonJs(page: Page) {
  await expect(page.getByTestId('test-non-js')).toHaveText('test-non-js: 0')
  await page.getByTestId('test-non-js').click()
  await expect(page.getByTestId('test-non-js')).toHaveText('test-non-js: 1')
}
