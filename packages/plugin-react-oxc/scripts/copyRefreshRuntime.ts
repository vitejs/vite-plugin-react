import { copyFileSync } from 'node:fs'

copyFileSync(
  'node_modules/@vitejs/react-common/refresh-runtime.js',
  'dist/refresh-runtime.js',
)
