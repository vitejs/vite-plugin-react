import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

const config: UserConfig = {
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
