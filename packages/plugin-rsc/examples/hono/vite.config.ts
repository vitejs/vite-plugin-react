import rsc from '@hiogawa/vite-rsc/plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    rsc({
      entries: {
        client: './src/client.tsx',
        rsc: './src/server.tsx',
        ssr: '@hiogawa/vite-rsc/extra/ssr',
      },
    }),
  ],
  build: {
    minify: false,
  },
}) as any
