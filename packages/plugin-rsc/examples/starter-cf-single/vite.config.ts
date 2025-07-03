import { cloudflare } from '@cloudflare/vite-plugin'
import rsc from '@hiogawa/vite-rsc/plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig((_env) => ({
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
    },
    ssr: {
      keepProcessEnv: false,
      build: {
        // build `ssr` inside `rsc` directory so that
        // wrangler can deploy self-contained `dist/rsc`
        outDir: './dist/rsc/ssr',
      },
    },
  },
}))
