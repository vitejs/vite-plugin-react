import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    watch: {
      ignored: ['!**/node_modules/**'],
    },
  },
  plugins: [
    react({
      exclude: [/\/node_modules\/(?!(\.pnpm\/)?test-package)/],
    }),
  ],
  optimizeDeps: {
    exclude: ['@vitejs/test-package'],
  },
})
