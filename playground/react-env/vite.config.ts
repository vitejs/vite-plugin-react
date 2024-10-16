import react from '@vitejs/plugin-react'
import type { UserConfig } from 'rolldown-vite'

// Overriding the NODE_ENV set by vitest
process.env.NODE_ENV = ''

const config: UserConfig = {
  server: { port: 8905 /* Should be unique */ },
  plugins: [react()],
  mode: 'staging',
  build: {
    // to make tests faster
    minify: false,
  },
}

export default config
