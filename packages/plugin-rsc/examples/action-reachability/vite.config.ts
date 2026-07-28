import react from '@vitejs/plugin-react'
import rsc, { getPluginApi, type PluginApi } from '@vitejs/plugin-rsc'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig({
  plugins: [rsc(), react(), writeReachabilityPicture()],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
          },
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.ssr.tsx',
          },
        },
      },
    },
    client: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.browser.tsx',
          },
        },
      },
    },
  },
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
