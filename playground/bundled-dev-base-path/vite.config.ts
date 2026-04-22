import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  server: { port: 8930 /* Should be unique */ },
  mode: 'development',
  base: '/static/',
  plugins: [react()],
  experimental: { bundledDev: true },
  build: { minify: false },
}

export default config
