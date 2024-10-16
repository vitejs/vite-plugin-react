import { defineConfig } from 'rolldown-vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 8901 /* Should be unique */ },
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(mdx|md|ts|tsx)$/ }),
  ],
})
