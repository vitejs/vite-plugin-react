import type { PluginItem as BabelPlugin } from '@babel/core'
import babel from '@rolldown/plugin-babel'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react({
      exclude: [/\/node_modules\/(?!(\.pnpm\/)?test-package)/],
    }),
    babel({
      exclude: [/\/node_modules\/(?!(\.pnpm\/)?test-package)/],
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
    }),
  ],
  optimizeDeps: {
    exclude: ['@vitejs/test-package'],
  },
})
