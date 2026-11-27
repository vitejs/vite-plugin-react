import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react({
      include: /\.tsx$/,
      exclude: [/\/src\/excluded\//, /\.skipped\.tsx$/],
    }),
  ],
})
