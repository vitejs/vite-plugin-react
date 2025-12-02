import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 8901 /* Should be unique */ },
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(mdx|md|ts|tsx)$/ }),
  ],
})
