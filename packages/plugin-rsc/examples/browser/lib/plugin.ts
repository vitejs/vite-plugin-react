import { rmSync } from 'node:fs'
import path from 'node:path'
import { normalizePath, type Plugin } from 'vite'

export default function vitePluginRscBrowser(): Plugin[] {
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
        const { client, rsc } = server.environments
        client.hot.on('transport-proxy:send', async (payload) => {
          const result = await rsc.hot.handleInvoke(payload)
          client.hot.send('transport-proxy:onMessage', {
            type: 'custom',
            event: 'vite:invoke',
            data: {
              name: payload.data.name,
              id: payload.data.id.replace('send', 'response'),
              data: result,
            },
          })
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
      renderChunk(code, chunk) {
        if (code.includes('virtual:vite-rsc-browser/load-rsc')) {
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
