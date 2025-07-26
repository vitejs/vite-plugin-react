import rsc from '@vitejs/plugin-rsc/plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    tailwindcss(),
    react(),
    rsc({
      entries: {
        client: 'src/entry.browser.tsx',
        rsc: 'src/entry.rsc.tsx',
        ssr: 'src/entry.ssr.tsx',
      },
    }),
    devtoolsJson(),
  ],
}) as any
