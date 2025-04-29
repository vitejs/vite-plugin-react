import path from 'node:path'
import fs from 'node:fs'
import type { Manifest } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CLIENT_ENTRY = path.join(import.meta.dirname, 'src/entry-client.jsx')
const SERVER_ENTRY = path.join(import.meta.dirname, 'src/entry-server.jsx')

export default defineConfig({
  appType: 'custom',
  build: {
    minify: false,
  },
  environments: {
    client: {
      build: {
        manifest: true,
        outDir: 'dist/client',
        rollupOptions: {
          input: { index: CLIENT_ENTRY },
        },
      },
    },
    ssr: {
      build: {
        outDir: 'dist/server',
        rollupOptions: {
          input: { index: SERVER_ENTRY },
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'ssr-middleware',
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              const mod = await server.ssrLoadModule(SERVER_ENTRY)
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(server) {
        const mod = await import(
          new URL('dist/server/index.js', import.meta.url).toString()
        )
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
    },
    {
      name: 'virtual-browser-entry',
      resolveId(source) {
        if (source === 'virtual:browser-entry') {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:browser-entry') {
          if (this.environment.mode === 'dev') {
            // ensure react hmr global before running client entry on dev.
            // vite prepends base via import analysis, so we only need `/@react-refresh`.
            return (
              react.preambleCode.replace('__BASE__', '/') +
              `import(${JSON.stringify(CLIENT_ENTRY)})`
            )
          }
        }
      },
    },
    {
      name: 'virtual-assets-manifest',
      resolveId(source) {
        if (source === 'virtual:assets-manifest') {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:assets-manifest') {
          let bootstrapModules: string[] = []
          if (this.environment.mode === 'dev') {
            bootstrapModules = ['/@id/__x00__virtual:browser-entry']
          } else {
            const manifest: Manifest = JSON.parse(
              fs.readFileSync(
                path.join(
                  import.meta.dirname,
                  'dist/client/.vite/manifest.json',
                ),
                'utf-8',
              ),
            )
            const entry = Object.values(manifest).find(
              (v) => v.name === 'index' && v.isEntry,
            )!
            bootstrapModules = [`/${entry.file}`]
          }
          return `export default ${JSON.stringify({ bootstrapModules })}`
        }
      },
    },
  ],
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.client)
      await builder.build(builder.environments.ssr)
    },
  },
})
