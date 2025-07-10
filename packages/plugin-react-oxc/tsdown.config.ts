import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  define: {
    'globalThis.__IS_BUILD__': 'true',
  },
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist/refresh-runtime.js',
    },
  ],
})
