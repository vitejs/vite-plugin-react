import { defineConfig } from 'rolldown-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 8908 /* Should be unique */ },
  plugins: [react()],
})
