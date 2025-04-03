import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  server: { port: 8903 /* Should be unique */ },
  plugins: [
    react({
      // @ts-expect-error classic jsx runtime is not supported
      jsxRuntime: 'classic',
    }),
  ],
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
