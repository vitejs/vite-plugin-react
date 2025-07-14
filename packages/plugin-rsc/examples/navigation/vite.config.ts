import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    rsc({
      entries: {
        client: './src/client.tsx',
        ssr: './src/server.ssr.tsx',
        rsc: './src/server.tsx',
      },
    }),
    inspect(),
  ],
})
