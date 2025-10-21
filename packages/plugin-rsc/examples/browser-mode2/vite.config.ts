import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'

export default defineConfig({
  plugins: [
    react(),
    rsc({
      entries: {
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
    rscBrowserMode2Plugin(),
  ],
})

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
