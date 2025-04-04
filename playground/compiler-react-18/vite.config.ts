import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    server: { port: 8901 /* Should be unique */ },
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { target: '18' }]],
        },
      }),
    ],
  }
})
