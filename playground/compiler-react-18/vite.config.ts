import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    server: { port: 8901 /* Should be unique */ },
    plugins: [
      react(),
      babel({
        presets: [reactCompilerPreset({ target: '18' })],
      }),
    ],
  }
})
