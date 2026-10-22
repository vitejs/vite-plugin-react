import { unstable_reactRouterRSC as reactRouterRSC } from '@react-router/dev/vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    reactRouterRSC({ __runningWithinTheReactRouterMonoRepo: true }),
    react(),
    rsc(),
  ],
})
