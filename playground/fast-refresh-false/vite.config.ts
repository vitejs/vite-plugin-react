import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mirrors a setup where another plugin owns Fast Refresh (e.g. React Router
// in framework mode) while this plugin still handles JSX and the React Compiler.
export default defineConfig({
  server: { port: 8912 /* Should be unique */ },
  plugins: [react({ compiler: true, fastRefresh: false })],
})
