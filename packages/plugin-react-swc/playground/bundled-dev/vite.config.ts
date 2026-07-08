import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bundled-dev/',
  server: { port: 8910 /* Should be unique */ },
  experimental: {
    bundledDev: true,
  },
  plugins: [react()],
})
