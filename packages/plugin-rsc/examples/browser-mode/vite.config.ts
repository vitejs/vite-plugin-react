import {
  defaultClientConditions,
  defineConfig,
  type Plugin,
  type ViteDevServer,
  type HotChannel,
  type HotChannelClient,
  DevEnvironment,
  type ResolvedConfig,
} from 'vite'
import {
  vitePluginRscMinimal,
  getPluginApi,
  type PluginApi,
} from '@vitejs/plugin-rsc/plugin'
import { createRequire } from 'node:module'
// import inspect from 'vite-plugin-inspect'

const require = createRequire(import.meta.url)

/**
 * Create a WebSocket HotChannel for module runner communication.
 *
 * This implements the server-side transport pattern for DevEnvironment,
 * as documented in Vite's Environment API:
 * https://github.com/vitejs/vite/blob/main/docs/guide/api-environment-runtimes.md#modulerunnertransport
 *
 * The pattern creates a HotChannel that:
 * - Handles WebSocket connections and messages
 * - Implements send/on/off methods for the HotChannel interface
 * - Communicates with the client's createWebSocketModuleRunnerTransport
 */
function createWebSocketHotChannel(options: {
  server: ViteDevServer
  path: string
}): HotChannel {
  const { server, path } = options
  const { WebSocket } = require('ws')

  const wss = new WebSocket.Server({ noServer: true })
  const listeners = new Map<string, Set<Function>>()

  // Handle HTTP upgrade for WebSocket connections
  server.httpServer?.on('upgrade', (req, socket, head) => {
    if (req.url === path) {
      wss.handleUpgrade(req, socket, head, (ws: any) => {
        wss.emit('connection', ws, req)
      })
    }
  })

  wss.on('connection', (ws: any) => {
    ws.on('message', async (data: any) => {
      try {
        const payload = JSON.parse(data.toString())

        // Handle ping messages
        if (payload.type === 'ping') {
          return
        }

        // Emit custom events to registered listeners
        if (payload.type === 'custom') {
          const eventListeners = listeners.get(payload.event)
          if (eventListeners) {
            const client: HotChannelClient = {
              send: (data) => ws.send(JSON.stringify(data)),
            }
            eventListeners.forEach((listener) => {
              listener(payload.data, client)
            })
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error)
      }
    })

    ws.on('error', (error: any) => {
      console.error('WebSocket error:', error)
    })

    // Trigger connection event
    const connectionListeners = listeners.get('connection')
    if (connectionListeners) {
      connectionListeners.forEach((listener) => listener())
    }
  })

  return {
    send(payload) {
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(payload))
        }
      })
    },
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler)
    },
    off(event, handler) {
      const eventListeners = listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(handler)
      }
    },
    listen() {
      // WebSocket server is already listening via httpServer upgrade event
    },
    close() {
      return new Promise<void>((resolve) => {
        wss.close(() => resolve())
      })
    },
  }
}

export default defineConfig({
  plugins: [
    // inspect(),
    rscBrowserModePlugin(),
  ],
  environments: {
    client: {
      build: {
        minify: false,
      },
    },
  },
})

function rscBrowserModePlugin(): Plugin[] {
  let manager: PluginApi['manager']
  let devServer: ViteDevServer | undefined

  return [
    ...vitePluginRscMinimal({
      environment: {
        rsc: 'client',
        browser: 'react_client',
      },
    }),
    {
      name: 'rsc-browser-mode',
      config(userConfig, env) {
        return {
          define: {
            'import.meta.env.__vite_rsc_build__': JSON.stringify(
              env.command === 'build',
            ),
          },
          environments: {
            client: {
              keepProcessEnv: false,
              resolve: {
                conditions: ['react-server', ...defaultClientConditions],
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react-dom',
                  'react-dom/client',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge',
                ],
                exclude: ['vite', '@vitejs/plugin-rsc'],
              },
              build: {
                outDir: 'dist/client',
              },
            },
            react_client: {
              keepProcessEnv: false,
              resolve: {
                conditions: [...defaultClientConditions],
                noExternal: true,
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react-dom',
                  'react-dom/client',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/client.browser',
                ],
                exclude: ['@vitejs/plugin-rsc'],
                esbuildOptions: {
                  platform: 'browser',
                },
              },
              dev: {
                createEnvironment(name, config, context) {
                  // Create transport using the server reference stored in closure
                  const transport = devServer
                    ? createWebSocketHotChannel({
                        server: devServer,
                        path: '/@vite-react-client',
                      })
                    : undefined
                  return new DevEnvironment(name, config, {
                    ...context,
                    hot: true,
                    transport,
                  })
                },
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
          builder: {
            sharedPlugins: true,
            sharedConfigBuild: true,
          },
          build: {
            // packages/common/warning.ts
            rollupOptions: {
              onwarn(warning, defaultHandler) {
                if (
                  warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                  (warning.message.includes('use client') ||
                    warning.message.includes('use server'))
                ) {
                  return
                }
                // https://github.com/vitejs/vite/issues/15012
                if (
                  warning.code === 'SOURCEMAP_ERROR' &&
                  warning.message.includes('resolve original location') &&
                  warning.pos === 0
                ) {
                  return
                }
                if (userConfig.build?.rollupOptions?.onwarn) {
                  userConfig.build.rollupOptions.onwarn(warning, defaultHandler)
                } else {
                  defaultHandler(warning)
                }
              },
            },
          },
        }
      },
      configResolved(config) {
        manager = getPluginApi(config)!.manager
      },
      configureServer(server) {
        devServer = server
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
      async buildApp(builder) {
        const reactServer = builder.environments.client!
        const reactClient = builder.environments['react_client']!
        manager.isScanBuild = true
        reactServer.config.build.write = false
        await builder.build(reactServer)
        manager.isScanBuild = false
        reactServer.config.build.write = true
        await builder.build(reactClient)
        await builder.build(reactServer)
      },
    },
    {
      name: 'rsc-browser-mode:load-client',
      resolveId(source) {
        if (source === 'virtual:vite-rsc-browser-mode/load-client') {
          if (this.environment.mode === 'dev') {
            return this.resolve('/src/framework/load-client-dev')
          }
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode/load-client') {
          if (manager.isScanBuild) {
            return `export default async () => {}`
          } else {
            return `export default async () => import("/dist/react_client/index.js")`
          }
        }
      },
    },
    {
      name: 'rsc-browser-mode:build-client-references',
      resolveId(source) {
        if (
          source === 'virtual:vite-rsc-browser-mode/build-client-references'
        ) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode/build-client-references') {
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
      name: 'rsc-browser-mode:build-server-references',
      resolveId(source) {
        if (
          source === 'virtual:vite-rsc-browser-mode/build-server-references'
        ) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-browser-mode/build-server-references') {
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
