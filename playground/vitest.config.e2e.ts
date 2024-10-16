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
    include: ['./playground/**/*.spec.[tj]s'],
    exclude: [
      './playground/react-emotion/**/*.spec.[tj]s', // the remotion need to transformer
      './playground/mdx/**/*.spec.[tj]s', // need to find a way to let rolldown-vite internal oxc transformer tread mdx as jsx
      './playground/ssr-react/**/*.spec.[tj]s', // need to find a way to disable the refresh transformer at ssr
    ],
    setupFiles: ['./playground/vitestSetup.ts'],
    globalSetup: ['./playground/vitestGlobalSetup.ts'],
    testTimeout: timeout,
    hookTimeout: timeout,
    reporters: 'dot',
    onConsoleLog(log) {
      if (log.match(/experimental|jit engine|emitted file|tailwind/i))
        return false
    },
  },
  esbuild: {
    target: 'node14',
  },
})
