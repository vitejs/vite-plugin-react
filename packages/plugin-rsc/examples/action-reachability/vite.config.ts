import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import rsc, { getPluginApi } from '@vitejs/plugin-rsc'
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
  return {
    name: 'write-reference-reachability-picture',
    buildApp: {
      order: 'post',
      async handler(builder) {
        const { manager } = getPluginApi(builder.config)!
        const outputPath = path.join(
          builder.config.root,
          'dist/client/reference-reachability.json',
        )
        fs.writeFileSync(
          outputPath,
          JSON.stringify(manager.clientReferenceServerReferences, null, 2),
        )
      },
    },
  }
}
