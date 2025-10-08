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
    'src/extra/browser.tsx',
    'src/extra/ssr.tsx',
    'src/extra/rsc.tsx',
    'src/transforms/index.ts',
    'src/plugins/cjs.ts',
    'src/rsc-html-stream/ssr.ts',
    'src/rsc-html-stream/browser.ts',
    'src/utils/rpc.ts',
    'src/utils/encryption-runtime.ts',
  ],
  format: ['esm'],
  external: [/^virtual:/, /^react-server-dom-webpack\//],
  dts: {
    sourcemap: process.argv.slice(2).includes('--sourcemap'),
  },
}) as any
