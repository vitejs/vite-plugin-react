import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

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
          input: path.resolve(_dirname, 'src/entry-server.jsx'),
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
              // "@vitejs/plugin-react/preamble" is used instead of transformIndexHtml
              // to setup react hmr globals.
              const template = fs.readFileSync(
                path.resolve(_dirname, 'index.html'),
                'utf-8',
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
          path.resolve(_dirname, 'dist/client/index.html'),
          'utf-8',
        )
        const { render } = await import(
          url.pathToFileURL(
            path.resolve(_dirname, './dist/server/entry-server.js'),
          )
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
