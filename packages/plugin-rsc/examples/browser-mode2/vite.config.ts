import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import rsc, { getPluginApi, type PluginApi } from '@vitejs/plugin-rsc'

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
  environments: {
    client: {
      build: {
        minify: false,
      },
    },
  },
})

function rscBrowserMode2Plugin(): Plugin[] {
  let manager: PluginApi['manager']

  return [
    {
      name: 'rsc-browser-mode2',
      configResolved(config) {
        manager = getPluginApi(config)!.manager
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
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode2/load-rsc') {
          // In build mode, return a function that dynamically imports the built RSC module
          if (manager.isScanBuild) {
            return `export default async () => {}`
          } else {
            // Use a dynamic import expression that won't be statically analyzed
            return `export default async () => {
              const path = "/dist/rsc/index.js"
              return await import(/* @vite-ignore */ path)
            }`
          }
        }
      },
    },
    {
      name: 'rsc-browser-mode2:build-client-references',
      resolveId(source) {
        if (
          source === 'virtual:vite-rsc-browser-mode2/build-client-references'
        ) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode2/build-client-references') {
          if (this.environment.mode === 'dev') {
            return `export default {}` // no-op during dev
          }
          let code = ''
          for (const meta of Object.values(manager.clientReferenceMetaMap)) {
            code += `${JSON.stringify(meta.referenceKey)}: () => import(${JSON.stringify(meta.importId)}),`
          }
          return `export default {${code}}`
        }
      },
    },
    {
      name: 'rsc-browser-mode2:build-server-references',
      resolveId(source) {
        if (
          source === 'virtual:vite-rsc-browser-mode2/build-server-references'
        ) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode2/build-server-references') {
          if (this.environment.mode === 'dev') {
            return `export default {}` // no-op during dev
          }
          let code = ''
          for (const meta of Object.values(manager.serverReferenceMetaMap)) {
            code += `${JSON.stringify(meta.referenceKey)}: () => import(${JSON.stringify(meta.importId)}),`
          }
          return `export default {${code}}`
        }
      },
    },
  ]
}
