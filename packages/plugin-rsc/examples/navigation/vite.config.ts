import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
  build: {
    minify: false,
  },
}) as any
