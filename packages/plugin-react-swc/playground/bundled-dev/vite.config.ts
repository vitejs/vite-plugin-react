import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bundled-dev/',
  experimental: {
    bundledDev: true,
  },
  plugins: [react()],
})
