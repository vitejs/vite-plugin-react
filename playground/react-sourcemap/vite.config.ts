import type { UserConfig } from 'vite'

import react from '@vitejs/plugin-react'

const config: UserConfig = {
  server: { port: 8906 /* Should be unique */ },
  plugins: [
    react({
      jsxRuntime: process.env.USE_CLASSIC === '1' ? 'classic' : 'automatic',
    }),
  ],
  build: {
    sourcemap: true,
  },
}

export default config
