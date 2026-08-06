import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'
import { callableCachePlugin } from './callable-cache-plugin.ts'

export default defineConfig({
  plugins: [
    react(),
    callableCachePlugin(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
})
