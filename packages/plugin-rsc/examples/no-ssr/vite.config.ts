import fsp from 'node:fs/promises'
import react from '@vitejs/plugin-react'
import rsc, { getPluginApi } from '@vitejs/plugin-rsc'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig({
  plugins: [
    spaPlugin(),
    react(),
    rsc({
      entries: {
        rsc: './src/framework/entry.rsc.tsx',
      },
      customBuildApp: true,
    }),
  ],
  builder: {
    sharedPlugins: true,
    sharedConfigBuild: true,
    async buildApp(builder) {
      const { manager } = getPluginApi(builder.config)!

      // Scan
      manager.isScanBuild = true
      builder.environments.rsc!.config.build.write = false
      builder.environments.client!.config.build.write = false
      await builder.build(builder.environments.rsc!)
      await builder.build(builder.environments.client!)
      builder.environments.rsc!.config.build.write = true
      builder.environments.client!.config.build.write = true
      manager.isScanBuild = false
      manager.stabilize()

      // Build
      await builder.build(builder.environments.rsc!)
      await builder.build(builder.environments.client!)

      // write manifest
      manager.writeAssetsManifest(['rsc'])
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
