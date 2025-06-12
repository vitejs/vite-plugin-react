import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    hmr: false,
  },
  plugins: [react()],
})
