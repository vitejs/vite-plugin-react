import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 8908 /* Should be unique */ },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'node-modules', test: 'node_modules' },
            { name: 'react', test: 'react' },
          ],
        },
      },
    },
  },
})
