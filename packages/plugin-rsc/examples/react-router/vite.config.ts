import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    // import("vite-plugin-inspect").then(m => m.default()),
    tailwindcss(),
    {
      // TODO: quick workaround for https://github.com/tailwindlabs/tailwindcss/pull/19670
      name: 'fix-tailwind-full-reload',
      configResolved(config) {
        const plugin = config.plugins.find(
          (p) => p.name === '@tailwindcss/vite:generate:serve',
        )
        delete plugin?.hotUpdate
      },
    },
    react(),
    rsc({
      entries: {
        client: './react-router-vite/entry.browser.tsx',
        ssr: './react-router-vite/entry.ssr.tsx',
        rsc: './react-router-vite/entry.rsc.single.tsx',
      },
    }),
  ],
  optimizeDeps: {
    include: ['react-router', 'react-router/internal/react-server-client'],
  },
}) as any
