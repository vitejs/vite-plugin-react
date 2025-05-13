import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const timeout = process.env.PWDEBUG ? Infinity : process.env.CI ? 20_000 : 5_000

export default defineConfig({
  resolve: {
    alias: {
      '~utils': resolve(__dirname, './test-utils'),
    },
  },
  test: {
    pool: 'forks',
    include: process.env.VITE_TEST_FULL_BUNDLE_MODE
      ? [
          './playground/class-components/**/*.spec.[tj]s',
          './playground/compiler/**/*.spec.[tj]s',
          './playground/compiler-react-18/**/*.spec.[tj]s',
          './playground/mdx/**/*.spec.[tj]s',
          // './playground/react/**/*.spec.[tj]s',
          // './playground/react-classic/**/*.spec.[tj]s',
          './playground/react-emotion/**/*.spec.[tj]s',
          './playground/react-env/**/*.spec.[tj]s',
          './playground/react-sourcemap/**/*.spec.[tj]s',
          // './playground/ssr-react/**/*.spec.[tj]s',
        ]
      : ['./playground/**/*.spec.[tj]s'],
    setupFiles: ['./playground/vitestSetup.ts'],
    globalSetup: ['./playground/vitestGlobalSetup.ts'],
    testTimeout: timeout,
    hookTimeout: timeout,
    reporters: 'dot',
  },
  esbuild: {
    target: 'node14',
  },
})
