import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  server: { port: 8906 /* Should be unique */ },
  plugins: [
    react({
      // @ts-expect-error classic runtime is not supported
      jsxRuntime: process.env.USE_CLASSIC === '1' ? 'classic' : 'automatic',
    }),
  ],
  build: {
    sourcemap: true,
  },
}

export default config
