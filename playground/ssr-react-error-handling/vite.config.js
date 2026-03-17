import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

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
              const htmlStream = await render(url)

              const template = fs.readFileSync(
                path.resolve(_dirname, 'index.html'),
                'utf-8',
              )

              // If render returned a string (CSR fallback), inject it directly
              if (typeof htmlStream === 'string') {
                const html = template.replace(`<!--app-html-->`, htmlStream)
                res.setHeader('content-type', 'text/html').end(html)
                return
              }

              // Stream the response for ReadableStream results
              const [before, after] = template.split('<!--app-html-->')
              res.setHeader('content-type', 'text/html')
              res.write(before)

              const reader = htmlStream.getReader()
              const decoder = new TextDecoder()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                res.write(decoder.decode(value, { stream: true }))
              }

              res.end(after)
            } catch (e) {
              // If SSR fails entirely, fall back to CSR shell
              console.error('[SSR] Fatal error, falling back to CSR:', e)
              const template = fs.readFileSync(
                path.resolve(_dirname, 'index.html'),
                'utf-8',
              )
              const html = template.replace(
                `<!--app-html-->`,
                `<script>window.__SSR_ERROR__ = true</script>`,
              )
              res.setHeader('content-type', 'text/html').end(html)
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
              const result = await render(url)
              if (typeof result === 'string') {
                const html = template.replace(`<!--app-html-->`, result)
                res.setHeader('content-type', 'text/html').end(html)
                return
              }

              const [before, after] = template.split('<!--app-html-->')
              res.setHeader('content-type', 'text/html')
              res.write(before)

              const reader = result.getReader()
              const decoder = new TextDecoder()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                res.write(decoder.decode(value, { stream: true }))
              }

              res.end(after)
            } catch (e) {
              console.error('[SSR] Fatal error, falling back to CSR:', e)
              const html = template.replace(
                `<!--app-html-->`,
                `<script>window.__SSR_ERROR__ = true</script>`,
              )
              res.setHeader('content-type', 'text/html').end(html)
            }
          })
        }
      },
    },
  ],
  // tell vitestSetup.ts to use buildApp API
  builder: {},
})
