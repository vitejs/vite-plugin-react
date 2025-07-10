import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  define: {
    'globalThis.__IS_BUILD__': 'true',
  },
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist/refresh-runtime.js',
    },
  ],
  outputOptions(outputOpts, format) {
    if (format === 'cjs') {
      outputOpts.footer = 'module.exports.default = module.exports'
    }
    return outputOpts
  },
})
