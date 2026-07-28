import react from '@vitejs/plugin-react'
import rsc, { getPluginApi, type PluginApi } from '@vitejs/plugin-rsc'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig({
  plugins: [
    rsc({
      entries: {
        client: './src/framework/entry.browser.jsx',
        rsc: './src/framework/entry.rsc.jsx',
        ssr: './src/framework/entry.ssr.jsx',
      },
    }),
    react(),
    writeReachabilityPicture(),
  ],
})

function writeReachabilityPicture(): Plugin {
  let manager: PluginApi['manager']
  return {
    name: 'write-reference-reachability-picture',
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    generateBundle() {
      if (this.environment.name !== 'client') return
      const reachability = manager.getClientToServerReferenceReachability(this)
      this.emitFile({
        type: 'asset',
        fileName: 'reference-reachability.json',
        source: JSON.stringify(reachability, null, 2),
      })
    },
  }
}
