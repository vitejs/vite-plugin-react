import { expect, test } from '@playwright/test'
import { setupDevServer } from '../../utils.ts'

test('bundledDev mode does not throw config.server error', async ({ page }) => {
  // The key verification: the dev server should start successfully
  // without the "Cannot read properties of undefined (reading 'config')" error
  // that the bug report (#1271) describes.
  const { testUrl, server } = await setupDevServer('bundled-dev')

  // Verify the server responds to requests (no crash)
  await page.goto(testUrl)
  const bodyText = await page.textContent('body')
  expect(bodyText).toBeTruthy()

  await server.close()
})
