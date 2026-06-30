import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bundled-dev/',
  server: { port: 8910 /* Should be unique */ },
  experimental: {
    bundledDev: true,
  },
  plugins: [react()],
})
