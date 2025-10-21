import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig, type Plugin } from 'vite'
import fsp from 'node:fs/promises'

export default defineConfig({
  plugins: [
    spaPlugin(),
    react(),
    rsc({
      entries: {
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
    rscBrowserMode2Plugin(),
  ],
  environments: {
    client: {
      build: {
        minify: false,
      },
    },
  },
})

function spaPlugin(): Plugin[] {
  // serve index.html before rsc server
  return [
    {
      name: 'serve-spa',
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              if (req.headers.accept?.includes('text/html')) {
                const html = await fsp.readFile('index.html', 'utf-8')
                const transformed = await server.transformIndexHtml('/', html)
                res.setHeader('Content-type', 'text/html')
                res.setHeader('Vary', 'accept')
                res.end(transformed)
                return
              }
            } catch (error) {
              next(error)
              return
            }
            next()
          })
        }
      },
    },
  ]
}

function rscBrowserMode2Plugin(): Plugin[] {
  return [
    {
      name: 'rsc-browser-mode2',
      config() {
        return {
          environments: {
            react_client: {
              resolve: {
                noExternal: true,
              },
              build: {
                outDir: 'dist/react_client',
                copyPublicDir: false,
                emitAssets: true,
                rollupOptions: {
                  input: {
                    index: './src/framework/entry.browser.tsx',
                  },
                },
              },
            },
          },
        }
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'https://any.local')
          if (url.pathname === '/@vite/invoke-react-client') {
            const payload = JSON.parse(url.searchParams.get('data')!)
            const result =
              await server.environments['react_client']!.hot.handleInvoke(
                payload,
              )
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
            return
          }
          next()
        })
      },
      hotUpdate(ctx) {
        if (this.environment.name === 'react_client') {
          if (ctx.modules.length > 0) {
            ctx.server.environments.client.hot.send({
              type: 'full-reload',
              path: ctx.file,
            })
          }
        }
      },
    },
    {
      name: 'rsc-browser-mode2:load-client',
      resolveId(source) {
        if (source === 'virtual:vite-rsc-browser-mode2/load-client') {
          if (this.environment.mode === 'dev') {
            return this.resolve('/src/framework/load-client-dev')
          }
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode2/load-client') {
          return `export default async () => import("/dist/react_client/index.js")`
        }
      },
    },
  ]
}
