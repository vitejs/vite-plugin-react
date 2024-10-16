import { defineConfig } from 'rolldown-vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    server: { port: 8900 /* Should be unique */ },
    plugins: [react()],
  }
})
