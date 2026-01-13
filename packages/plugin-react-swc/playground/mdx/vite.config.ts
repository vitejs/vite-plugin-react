import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [mdx(), react()],
})
