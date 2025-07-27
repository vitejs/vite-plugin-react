import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'
import { reactRouter } from './react-router-vite/plugin'

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    tailwindcss(),
    react(),
    reactRouter(),
    rsc({
      entries: {
        client: './react-router-vite/entry.browser.tsx',
        ssr: './react-router-vite/entry.ssr.tsx',
        rsc: './react-router-vite/entry.rsc.single.tsx',
      },
    }),
    inspect(),
  ],
  optimizeDeps: {
    include: ['react-router', 'react-router/internal/react-server-client'],
  },
}) as any
