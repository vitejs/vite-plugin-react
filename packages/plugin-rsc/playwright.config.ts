import { defineConfig, devices } from '@playwright/test'

// CI runs the full suite on Linux chromium, and only the tests that can behave
// differently on other OSes or browser engines elsewhere.
// Test files not listed here run only in the full suite.
const subsets: Record<string, string[]> = {
  // native paths, `file://` URLs, process spawn/kill, temp-dir installs, file watching
  os: [
    'basic',
    'starter',
    'react-router',
    'syntax-error',
    'root',
    'use-cache-persistent',
    'source-map',
    'isolated',
    'cache-replay',
    'cloudflare',
    'middleware-mode',
    'nested-outdir',
  ],
  // what the browser does with the output: no-JS form submission, CSS application,
  // HMR client and error overlay, streaming and hydration, RSC running in the browser
  browser: [
    'basic',
    'starter',
    'react-router',
    'syntax-error',
    'use-cache-persistent',
    'use-cache-callable',
    'ppr',
    'browser-mode',
    'browser',
    'use-cache',
    'action-reachability',
    'custom-server-function',
    'css-code-split',
    'ssr-encode-form-action',
    'manual-css',
    'no-ssr',
    'css-link-precedence',
    'client-first',
  ],
}

function getTestMatch() {
  const subset = process.env.E2E_SUBSET
  if (!subset) return {}
  const files = subsets[subset]
  if (!files) {
    throw new Error(`Unknown E2E_SUBSET '${subset}'`)
  }
  return { testMatch: files.map((name) => `**/${name}.test.ts`) }
}

export default defineConfig({
  testDir: 'e2e',
  ...getTestMatch(),
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-all-retries',
  },
  expect: {
    toPass: { timeout: 10000 },
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
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: ['list', process.env.CI && 'github']
    .filter(Boolean)
    .map((name) => [name] as any),
}) as any
