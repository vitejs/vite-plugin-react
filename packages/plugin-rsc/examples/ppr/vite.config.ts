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

const PPR_MANIFEST_ID = 'virtual:ppr-manifest'
const PPR_MANIFEST_FILE = '__ppr_manifest.js'

function pprBuildPlugin(): Plugin {
  return {
    name: 'rsc-ppr',
    resolveId(source) {
      if (source === PPR_MANIFEST_ID) {
        return this.environment.mode === 'build'
          ? { id: source, external: true }
          : '\0' + source
      }
    },
    load(id) {
      if (id === '\0' + PPR_MANIFEST_ID) {
        return 'export default undefined'
      }
    },
    // Mirror plugin-rsc's own build-time assets manifest: leave the virtual
    // import external, then point it at an ESM sidecar generated after builds.
    // https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/src/plugin.ts#L1235-L1249
    renderChunk(code, chunk) {
      if (code.includes(PPR_MANIFEST_ID)) {
        let relativePath = path.posix.relative(
          path.posix.dirname(chunk.fileName),
          PPR_MANIFEST_FILE,
        )
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath
        }
        return { code: code.replaceAll(PPR_MANIFEST_ID, relativePath) }
      }
    },
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
    path.join(rscOutDir, PPR_MANIFEST_FILE),
    `export default ${JSON.stringify(manifest)}\n`,
  )
}
