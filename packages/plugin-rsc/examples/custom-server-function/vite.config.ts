import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'
import { customServerFunctionPlugin } from './custom-server-function-plugin.ts'

export default defineConfig({
  plugins: [customServerFunctionPlugin(), rsc(), react()],
  environments: {
    rsc: {
      build: {
        rollupOptions: { input: { index: './src/framework/entry.rsc.tsx' } },
      },
    },
    ssr: {
      build: {
        rollupOptions: { input: { index: './src/framework/entry.ssr.tsx' } },
      },
    },
    client: {
      build: {
        rollupOptions: {
          input: { index: './src/framework/entry.browser.tsx' },
        },
      },
    },
  },
})
