import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 8907 /* Should be unique */ },
  plugins: [react()],
  build: {
    minify: false,
  },
})
