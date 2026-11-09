import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/reactCompilerBabelPreset.ts'],
  fixedExtension: false,
  dts: true,
  deps: {
    neverBundle: ['#optionalTypes'],
  },
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist',
    },
  ],
})
