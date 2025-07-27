import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { PluginItem as BabelPlugin } from '@babel/core'

export default defineConfig({
  plugins: [
    react({
      exclude: [/\/node_modules\/(?!(\.pnpm\/)?test-package)/],
      babel: {
        plugins: [
          ({ types: t }): BabelPlugin => ({
            name: 'test-replace-test-babel',
            visitor: {
              Identifier(path) {
                if (path.node.name === 'TEST_BABEL') {
                  path.replaceWith(t.booleanLiteral(true))
                }
              },
            },
          }),
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@vitejs/test-package'],
  },
})
