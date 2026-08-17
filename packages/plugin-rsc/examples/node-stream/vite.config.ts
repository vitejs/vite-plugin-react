import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'
import { nodeServerPlugin } from './src/framework/server-plugin.ts'

export default defineConfig({
  plugins: [rsc({ serverHandler: false }), react(), nodeServerPlugin()],
  environments: {
    rsc: {
      optimizeDeps: {
        include: [
          '@vitejs/plugin-rsc/vendor/react-server-dom/server.node',
          '@vitejs/plugin-rsc/vendor/react-server-dom/static.node',
          '@vitejs/plugin-rsc/vendor/react-server-dom/client.node',
        ],
      },
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
          },
        },
      },
    },
    ssr: {
      optimizeDeps: {
        include: ['@vitejs/plugin-rsc/vendor/react-server-dom/client.node'],
      },
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
