import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    trace: 'on-first-retry',
  },
  expect: {
    toPass: { timeout: 5000 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: null,
        deviceScaleFactor: undefined,
      },
    },
    {
      name: 'firefox',
      use: devices['Desktop Firefox'],
    },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
    },
  ],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: ['list', process.env.CI && 'github']
    .filter(Boolean)
    .map((name) => [name] as any),
}) as any
