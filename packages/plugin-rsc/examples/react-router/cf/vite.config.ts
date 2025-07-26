import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@vitejs/plugin-rsc/plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

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
      },
      serverHandler: false,
    }),
    inspect(),
    cloudflare({
      configPath: './cf/wrangler.ssr.jsonc',
      viteEnvironment: {
        name: 'ssr',
      },
      auxiliaryWorkers: [
        {
          configPath: './cf/wrangler.rsc.jsonc',
          viteEnvironment: {
            name: 'rsc',
          },
        },
      ],
    }),
  ],
  environments: {
    client: {
      optimizeDeps: {
        include: ['react-router', 'react-router/internal/react-server-client'],
      },
    },
    ssr: {
      optimizeDeps: {
        include: ['react-router > cookie', 'react-router > set-cookie-parser'],
        exclude: ['react-router'],
      },
    },
    rsc: {
      optimizeDeps: {
        include: ['react-router > cookie', 'react-router > set-cookie-parser'],
        exclude: ['react-router'],
      },
    },
  },
}) as any
