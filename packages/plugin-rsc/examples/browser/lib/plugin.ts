import assert from 'node:assert'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { normalizePath, type Plugin, type Rollup } from 'vite'

export default function vitePluginRscBrowser(): Plugin[] {
  let rscBundle: Rollup.OutputBundle

  return [
    {
      name: 'rsc-browser',
      config() {
        return {
          appType: 'spa',
          environments: {
            client: {
              build: {
                emptyOutDir: false,
              },
            },
            // TODO: server build is not hashed
            rsc: {
              build: {
                outDir: 'dist/client/__server',
                rollupOptions: {
                  output: {
                    entryFileNames: '[name]-[hash].js',
                  },
                },
              },
              keepProcessEnv: false,
              resolve: {
                noExternal: true,
              },
              optimizeDeps: {
                esbuildOptions: {
                  platform: 'neutral',
                },
              },
            },
          },
          rsc: {
            serverHandler: false,
          },
        }
      },
      configResolved(config) {
        // avoid globalThis.AsyncLocalStorage injection in browser mode
        const plugin = config.plugins.find(
          (p) => p.name === 'rsc:inject-async-local-storage',
        )
        delete plugin!.transform
      },
      buildApp: {
        order: 'pre',
        async handler() {
          // clean up nested outDir
          rmSync('./dist', { recursive: true, force: true })
        },
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'https://any.local')
          if (url.pathname === '/@vite/invoke-rsc') {
            const payload = JSON.parse(url.searchParams.get('data')!)
            const result =
              await server.environments['rsc']!.hot.handleInvoke(payload)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
            return
          }
          next()
        })
      },
    },
    {
      name: 'rsc-browser:load-rsc',
      resolveId(source) {
        if (source === 'virtual:vite-rsc-browser/load-rsc') {
          if (this.environment.mode === 'dev') {
            return this.resolve('/lib/dev-proxy')
          }
          return { id: source, external: true }
        }
      },
      generateBundle(_options, bundle) {
        if (this.environment.name === 'rsc') {
          rscBundle = bundle
        }
      },
      renderChunk(code, chunk) {
        if (code.includes('virtual:vite-rsc-browser/load-rsc')) {
          assert(this.environment.name === 'client')
          const rscEntry = Object.values(rscBundle).find(
            (v) => v.type === 'chunk' && v.isEntry,
          )!
          const config = this.environment.getTopLevelConfig()
          const replacement = normalizeRelativePath(
            path.relative(
              path.join(
                config.environments.client.build.outDir,
                chunk.fileName,
                '..',
              ),
              path.join(
                config.environments.rsc.build.outDir,
                rscEntry.fileName,
              ),
            ),
          )
          code = code.replaceAll(
            'virtual:vite-rsc-browser/load-rsc',
            () => replacement,
          )
          return { code }
        }
      },
    },
  ]
}

function normalizeRelativePath(s: string): string {
  s = normalizePath(s)
  return s[0] === '.' ? s : './' + s
}
