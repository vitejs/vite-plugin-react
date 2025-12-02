import type { UserConfig } from 'vite'

import react from '@vitejs/plugin-react'

const config: UserConfig = {
  server: { port: 8903 /* Should be unique */ },
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
  ],
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
