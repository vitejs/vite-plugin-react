import { resolve } from 'node:path'
import { defaultExclude, defineConfig } from 'vitest/config'

const timeout = process.env.PWDEBUG ? Infinity : process.env.CI ? 20_000 : 5_000

export default defineConfig({
  resolve: {
    alias: {
      '~utils': resolve(__dirname, './test-utils'),
    },
  },
  test: {
    pool: 'forks',
    include: ['./playground/**/*.spec.[tj]s'],
    exclude: [
      ...defaultExclude,
      ...(process.env.VITE_TEST_FULL_BUNDLE_MODE
        ? ['./playground/ssr-react/**/*']
        : []),
    ],
    setupFiles: ['./playground/vitestSetup.ts'],
    globalSetup: ['./playground/vitestGlobalSetup.ts'],
    testTimeout: timeout,
    hookTimeout: timeout,
    reporters: 'dot',
    expect: {
      poll: {
        timeout: 50 * (process.env.CI ? 200 : 50),
      },
    },
  },
  esbuild: {
    target: 'node14',
  },
})
