import { reactRouter } from '@react-router/dev/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// React Router in framework mode provides its own Fast Refresh, so this
// plugin only handles JSX and the React Compiler next to it.
export default defineConfig({
  server: { port: 8912 /* Should be unique */ },
  plugins: [react({ compiler: true, fastRefresh: false }), reactRouter()],
})
