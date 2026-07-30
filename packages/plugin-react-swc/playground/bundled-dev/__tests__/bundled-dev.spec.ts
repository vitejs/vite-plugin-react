import { expect, test } from '@playwright/test'
import { setupDevServer } from '../../utils.ts'

test('should render', async ({ page }) => {
  const { testUrl, server } = await setupDevServer('bundled-dev')
  await page.goto(testUrl)

  // In bundled dev mode, the page initially shows a "Bundling in progress"
  // placeholder and reloads once the bundle is ready.
  await expect(page.locator('h1')).toHaveText('Hello Vite + React')

  await server.close()
})

test('should update', async ({ page }) => {
  const { testUrl, server } = await setupDevServer('bundled-dev')
  await page.goto(testUrl)

  await expect(page.locator('#state-button')).toHaveText('count is: 0')
  await page.click('#state-button')
  await expect(page.locator('#state-button')).toHaveText('count is: 1')

  await server.close()
})

test('should hmr', async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer('bundled-dev')
  await page.goto(testUrl)

  await page.click('#state-button')
  await expect(page.locator('#state-button')).toHaveText('count is: 1')

  editFile('src/App.tsx', ['Vite + React', 'Vite + React Updated'])
  await expect(page.locator('h1')).toHaveText('Hello Vite + React Updated')
  // preserve state
  await expect(page.locator('#state-button')).toHaveText('count is: 1')

  editFile('src/App.tsx', ['Vite + React Updated', 'Vite + React'])
  await expect(page.locator('h1')).toHaveText('Hello Vite + React')

  await server.close()
})
