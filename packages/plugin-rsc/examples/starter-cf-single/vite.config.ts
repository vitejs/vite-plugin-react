import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    react(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
      },
      serverHandler: false,
      loadModuleDevProxy: true,
      useBuildAppHook: true,
    }),
    cloudflare({
      configPath: './wrangler.jsonc',
      viteEnvironment: {
        name: 'rsc',
      },
    }),
  ],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          // ensure `default` export only in cloudflare entry output
          preserveEntrySignatures: 'exports-only',
        },
      },
      optimizeDeps: {
        include: ['turbo-stream'],
      },
    },
    ssr: {
      keepProcessEnv: false,
      build: {
        // build `ssr` inside `rsc` directory so that
        // wrangler can deploy self-contained `dist/rsc`
        outDir: './dist/rsc/ssr',
      },
      resolve: {
        noExternal: true,
      },
    },
  },
  builder: {
    // empty buildApp to disable cloudflare's buildApp
    // https://github.com/cloudflare/workers-sdk/blob/19e2aab1d68594c7289d0aa16474544919fd5b9b/packages/vite-plugin-cloudflare/src/index.ts#L183-L186
    buildApp: async () => {},
  },
})
