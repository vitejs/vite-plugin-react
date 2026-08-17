import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin, ResolvedConfig, RunnableDevEnvironment } from 'vite'

// Install the RSC entry as a native Node handler without the plugin's default
// Fetch adapter. The dev import goes through the runner to preserve HMR.
type NodeHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>

export function nodeServerPlugin(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'node-server',
    configResolved(config_) {
      config = config_
    },
    configureServer(server) {
      const environment = server.environments.rsc as RunnableDevEnvironment
      return () => {
        server.middlewares.use(async (request, response, next) => {
          try {
            const source = '/src/framework/entry.rsc.tsx'
            const resolved = await environment.pluginContainer.resolveId(source)
            if (!resolved) throw new Error(`Failed to resolve ${source}`)
            const module = await environment.runner.import(resolved.id)
            const handler = module.default as NodeHandler
            request.url = request.originalUrl ?? request.url
            await handler(request, response)
          } catch (error) {
            next(error)
          }
        })
      }
    },
    async configurePreviewServer(server) {
      const outDir = config.environments.rsc?.build.outDir ?? 'dist/rsc'
      const entry = pathToFileURL(
        path.resolve(config.root, outDir, 'index.js'),
      ).href
      const module = await import(/* @vite-ignore */ entry)
      const handler = module.default as NodeHandler

      server.middlewares.use((request, _response, next) => {
        delete request.headers['accept-encoding']
        next()
      })

      return () => {
        server.middlewares.use(async (request, response, next) => {
          try {
            request.url = request.originalUrl ?? request.url
            await handler(request, response)
          } catch (error) {
            next(error)
          }
        })
      }
    },
  }
}
