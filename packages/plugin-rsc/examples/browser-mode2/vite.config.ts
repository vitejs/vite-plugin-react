import { defineConfig, normalizePath, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import path from 'node:path'
import { rmSync } from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    rscBrowserModePlugin(),
    rsc({
      entries: {
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
})

function rscBrowserModePlugin(): Plugin[] {
  return [
    {
      name: 'rsc-browser-mode2',
      config() {
        return {
          appType: 'spa',
          environments: {
            client: {
              build: {
                emptyOutDir: false,
              },
            },
            rsc: {
              build: {
                outDir: 'dist/client/__server',
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
      name: 'rsc-browser-mode2:load-rsc',
      resolveId(source) {
        if (source === 'virtual:vite-rsc-browser-mode2/load-rsc') {
          if (this.environment.mode === 'dev') {
            return this.resolve('/src/framework/load-rsc-dev')
          }
          return { id: source, external: true }
        }
      },
      renderChunk(code, chunk) {
        if (code.includes('virtual:vite-rsc-browser-mode2/load-rsc')) {
          const config = this.environment.getTopLevelConfig()
          const replacement = normalizeRelativePath(
            path.relative(
              path.join(
                config.environments.client.build.outDir,
                chunk.fileName,
                '..',
              ),
              path.join(config.environments.rsc.build.outDir, 'index.js'),
            ),
          )
          code = code.replaceAll(
            'virtual:vite-rsc-browser-mode2/load-rsc',
            () => replacement,
          )
          return { code }
        }

        code
      },
    },
  ]
}

function normalizeRelativePath(s: string): string {
  s = normalizePath(s)
  return s[0] === '.' ? s : './' + s
}
