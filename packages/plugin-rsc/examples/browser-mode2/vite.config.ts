import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
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
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  environments: {
    rsc: {
      resolve: {
        noExternal: true,
        alias: {
          'node:async_hooks': '/src/framework/async-hooks-polyfill.js',
        },
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge',
          '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge',
        ],
        exclude: ['@vitejs/plugin-rsc'],
        esbuildOptions: {
          platform: 'browser',
        },
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
      configurePreviewServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              if (req.headers.accept?.includes('text/html')) {
                const html = await fsp.readFile(
                  'dist/client/index.html',
                  'utf-8',
                )
                res.end(html)
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
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode2/load-rsc') {
          // In build mode, return a function that dynamically imports the built RSC module
          return `export default async () => {
            return await import("/dist/rsc/index.js")
          }`
        }
      },
    },
  ]
}
