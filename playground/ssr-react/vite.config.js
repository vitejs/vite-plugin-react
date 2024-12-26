import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

process.env.MY_CUSTOM_SECRET = 'API_KEY_qwertyuiop'

export default defineConfig({
  appType: 'custom',
  build: {
    minify: false,
  },
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
      },
    },
    ssr: {
      build: {
        outDir: 'dist/server',
        rollupOptions: {
          input: 'src/entry-server.jsx',
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
            const url = req.originalUrl ?? '/'
            try {
              const { render } = await server.ssrLoadModule(
                '/src/entry-server.jsx',
              )
              const appHtml = render(url)
              const template = await server.transformIndexHtml(
                url,
                fs.readFileSync(path.resolve('index.html'), 'utf-8'),
              )
              const html = template.replace(`<!--app-html-->`, appHtml)
              res.setHeader('content-type', 'text/html').end(html)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(server) {
        const template = fs.readFileSync(
          path.resolve('dist/client/index.html'),
          'utf-8',
        )
        const { render } = await import(
          new URL('./dist/server/entry-server.js', import.meta.url).href
        )
        return () => {
          server.middlewares.use(async (req, res, next) => {
            const url = req.originalUrl ?? '/'
            try {
              const appHtml = render(url)
              const html = template.replace(`<!--app-html-->`, appHtml)
              res.setHeader('content-type', 'text/html').end(html)
            } catch (e) {
              next(e)
            }
          })
        }
      },
    },
  ],
  // tell vitestSetup.ts to use buildApp API
  builder: {},
})
