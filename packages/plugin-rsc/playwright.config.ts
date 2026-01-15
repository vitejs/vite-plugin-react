import { defineConfig, devices } from '@playwright/test'

const browsers = [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: null,
      deviceScaleFactor: undefined,
    },
  },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  { name: 'webkit', use: devices['Desktop Safari'] },
]

export default defineConfig({
  testDir: 'e2e',
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-all-retries',
  },
  expect: {
    toPass: { timeout: 10000 },
  },
  projects: [
    ...browsers,
    // "others-*" projects exclude basic.test.ts for parallel runs
    ...browsers.map((b) => ({
      ...b,
      name: `others-${b.name}`,
      testIgnore: 'basic.test.ts',
    })),
  ],
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: ['list', process.env.CI && 'github']
    .filter(Boolean)
    .map((name) => [name] as any),
}) as any
