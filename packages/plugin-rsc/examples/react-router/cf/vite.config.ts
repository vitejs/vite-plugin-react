import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// import inspect from 'vite-plugin-inspect'

export default defineConfig((env) => ({
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
        ssr: './react-router-vite/entry.ssr.tsx',
      },
      serverHandler: false,
      loadModuleDevProxy: true,
    }),
    cloudflare({
      configPath: './cf/wrangler.jsonc',
      viteEnvironment: {
        name: 'rsc',
      },
    }),
  ],
  environments: {
    client: {
      optimizeDeps: {
        include: ['react-router', 'react-router/internal/react-server-client'],
      },
    },
    ssr: {
      keepProcessEnv: false,
      build: {
        outDir: './dist/rsc/ssr',
      },
      resolve:
        env.command === 'build'
          ? {
              noExternal: true,
            }
          : undefined,
    },
    rsc: {
      optimizeDeps: {
        exclude: ['react-router'],
      },
    },
  },
}))
