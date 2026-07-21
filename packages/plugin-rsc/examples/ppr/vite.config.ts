import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { type Plugin, type ResolvedConfig, defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        rsc: './src/framework/entry.rsc.tsx',
        ssr: './src/framework/entry.ssr.tsx',
      },
    }),
    pprBuildPlugin(),
  ],
})

function pprBuildPlugin(): Plugin {
  return {
    name: 'rsc-ppr',
    buildApp: {
      order: 'post',
      async handler(builder) {
        await renderPprManifest(builder.config)
      },
    },
  }
}

async function renderPprManifest(config: ResolvedConfig): Promise<void> {
  const rscOutDir = config.environments.rsc.build.outDir
  const entry: typeof import('./src/framework/entry.rsc') = await import(
    pathToFileURL(path.join(rscOutDir, 'index.js')).href
  )
  config.logger.info('[vite-rsc:ppr] generating manifest')
  const manifest = await entry.generatePprManifest()

  await fs.promises.writeFile(
    path.join(rscOutDir, 'ppr-manifest.json'),
    JSON.stringify(manifest),
  )
}
