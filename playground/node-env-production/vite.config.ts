import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

process.env.NODE_ENV = 'production'

const config: UserConfig = {
  server: { port: 8911 /* Should be unique */ },
  plugins: [react()],
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
