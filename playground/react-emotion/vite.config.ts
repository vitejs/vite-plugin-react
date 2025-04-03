import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 8904 /* Should be unique */ },
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      // @ts-expect-error babel plugins are not supported
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  clearScreen: false,
  build: {
    // to make tests faster
    minify: false,
  },
})
