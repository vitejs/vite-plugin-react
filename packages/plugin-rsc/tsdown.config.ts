import fs from 'node:fs'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugin.ts',
    'src/browser.ts',
    'src/ssr.tsx',
    'src/rsc.tsx',
    'src/core/browser.ts',
    'src/core/ssr.ts',
    'src/core/rsc.ts',
    'src/core/plugin.ts',
    'src/react/browser.ts',
    'src/react/ssr.ts',
    'src/react/rsc.ts',
    'src/transforms/index.ts',
    'src/plugins/cjs.ts',
    'src/utils/rpc.ts',
    'src/utils/encryption-runtime.ts',
  ],
  format: ['esm'],
  fixedExtension: false,
  external: [/^virtual:/, /^@vitejs\/plugin-rsc\/vendor\//],
  dts: {
    sourcemap: process.argv.slice(2).includes('--sourcemap'),
  },
  plugins: [
    {
      name: 'vendor-react-server-dom',
      buildStart() {
        fs.rmSync('./dist/vendor/', { recursive: true, force: true })
        fs.mkdirSync('./dist/vendor', { recursive: true })
        fs.cpSync(
          './node_modules/react-server-dom-webpack',
          './dist/vendor/react-server-dom',
          {
            recursive: true,
            dereference: true,
          },
        )
        fs.rmSync('./dist/vendor/react-server-dom/node_modules', {
          recursive: true,
          force: true,
        })
      },
    },
  ],
}) as any
