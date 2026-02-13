import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  oxc: {
    plugins: {
      styledComponents: {},
    },
  },
  plugins: [react()],
})
