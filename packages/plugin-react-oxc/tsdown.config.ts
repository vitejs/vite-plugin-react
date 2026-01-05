import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  fixedExtension: false,
  dts: true,
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist',
    },
  ],
})
