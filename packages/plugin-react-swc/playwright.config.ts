import { fileURLToPath } from 'node:url'
import { type PlaywrightTestConfig, devices } from '@playwright/test'
import fs from 'fs-extra'

const tempDir = fileURLToPath(new URL('playground-temp', import.meta.url))
fs.ensureDirSync(tempDir)
fs.emptyDirSync(tempDir)
fs.copySync(fileURLToPath(new URL('playground', import.meta.url)), tempDir, {
  filter: (src) => {
    src = src.replaceAll('\\', '/')
    return (
      !src.includes('/__tests__') &&
      !src.includes('/.vite') &&
      !src.includes('/dist')
    )
  },
})

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env['CI'],
  workers: 1,
  timeout: 10_000,
  reporter: process.env['CI'] ? 'github' : 'list',
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
}

export default config
