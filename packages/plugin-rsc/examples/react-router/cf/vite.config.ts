import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@hiogawa/vite-rsc/plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'
import { reactRouter } from '../react-router-vite/plugin'

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
    {
      name: 'react-router-fixup',
      transform(code) {
        if (code.includes(`import { AsyncLocalStorage } from 'async_hooks';`)) {
          code = code.replaceAll('async_hooks', 'node:async_hooks')
          code = code.replaceAll(
            `global.___reactRouterServerStorage___`,
            `globalThis.___reactRouterServerStorage___`,
          )
          return code
        }
      },
    },
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
})
