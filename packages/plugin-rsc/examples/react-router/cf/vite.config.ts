import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// import inspect from 'vite-plugin-inspect'

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    // inspect(),
    tailwindcss(),
    react(),
    rsc({
      entries: {
        client: './react-router-vite/entry.browser.tsx',
      },
      serverHandler: false,
    }),
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
        exclude: ['react-router'],
      },
    },
    rsc: {
      optimizeDeps: {
        exclude: ['react-router'],
      },
    },
  },
})
