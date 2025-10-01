import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  server: { port: 8902 /* Should be unique */ },
  mode: 'development',
  plugins: [
    react({
      reactRefreshHost: 'http://localhost:8902',
    }),
  ],
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
