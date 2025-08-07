import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist/refresh-runtime.js',
    },
  ],
})
