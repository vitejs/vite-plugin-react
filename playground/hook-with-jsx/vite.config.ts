import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 8909 /* Should be unique */ },
  plugins: [react()],
})
