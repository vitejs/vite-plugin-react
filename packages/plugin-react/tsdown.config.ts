import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist/refresh-runtime.js',
    },
  ],
  outputOptions(outputOpts, format) {
    if (format === 'cjs') {
      outputOpts.footer = (chunk) => {
        // don't append to dts files
        if (chunk.fileName.endsWith('.cjs')) {
          return 'module.exports.default = module.exports'
        }
        return ''
      }
    }
    return outputOpts
  },
})
