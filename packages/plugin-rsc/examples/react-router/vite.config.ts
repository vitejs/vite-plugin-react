import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'
import { reactRouter } from './react-router-vite/plugin'
import { nitroPlugin } from './nitro'
import path from 'path'

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
        ssr: './react-router-vite/entry.ssr.single.tsx',
        rsc: './react-router-vite/entry.rsc.tsx',
      },
      serverHandler: {
        environmentName: 'ssr',
        entryName: 'index',
      },
    }),
    inspect(),
    !!process.env.NITRO_PRESET &&
      nitroPlugin({
        preset: process.env.NITRO_PRESET as any,
        // TODO: this can be inferred from config, such as
        // - builder.environments.client.config.build.outDir
        clientDir: path.resolve('./dist/client'),
        serverEntry: path.resolve('./dist/ssr/index.js'),
      }),
  ],
  optimizeDeps: {
    include: ['react-router', 'react-router/internal/react-server-client'],
  },
}) as any
