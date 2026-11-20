import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'
import { nodeServerPlugin } from './src/framework/server-plugin.ts'

export default defineConfig({
  plugins: [
    rsc({
      serverHandler: false,
      // pair Flight with `react-dom/server.node` used by `entry.ssr.tsx`
      reactServerDomBuild: 'node',
    }),
    react(),
    nodeServerPlugin(),
  ],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
          },
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.ssr.tsx',
          },
        },
      },
    },
    client: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.browser.tsx',
          },
        },
      },
    },
  },
})
