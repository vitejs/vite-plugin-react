import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import rscBrowser from './lib/plugin'

export default defineConfig({
  plugins: [
    react(),
    rscBrowser(),
    rsc({
      entries: {
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
})
