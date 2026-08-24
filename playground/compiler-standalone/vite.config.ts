import react, { reactCompiler } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The standalone plugin is meant for setups where JSX and Fast Refresh are
// owned by another plugin (e.g. React Router framework mode). Here `react()`
// plays that role, so this mirrors the `compiler` playground with the native
// standalone plugin in place of the Babel preset.
export default defineConfig({
  server: { port: 8912 /* Should be unique */ },
  plugins: [react(), reactCompiler()],
})
