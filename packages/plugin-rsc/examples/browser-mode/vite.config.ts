import { defaultClientConditions, defineConfig } from 'vite'
import {
  vitePluginRscMinimal,
  vitePluginUseClient,
  vitePluginUseServer,
  vitePluginDefineEncryptionKey,
} from '@vitejs/plugin-rsc/plugin'

export default defineConfig({
  plugins: [
    vitePluginRscMinimal(),
    vitePluginUseClient({
      environment: {
        server: ['client'],
      },
    }),
    vitePluginUseServer({
      environment: {
        server: ['client'],
      },
    }),
    vitePluginDefineEncryptionKey(),
    {
      name: 'rsc:browser-mode',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'https://any.local')
          if (url.pathname === '/@vite/invoke-react-client') {
            const payload = JSON.parse(url.searchParams.get('data')!)
            const result =
              await server.environments['react_client']!.hot.handleInvoke(
                payload,
              )
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
      config() {
        return {
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
                  '@vitejs/plugin-rsc/vendor/react-server-dom/server.browser',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/client.browser',
                ],
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
                exclude: ['fsevents'],
                esbuildOptions: {
                  platform: 'browser',
                },
              },
            },
          },
          resolve: {
            alias: {
              '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge':
                '@vitejs/plugin-rsc/vendor/react-server-dom/server.browser',
              '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge':
                '@vitejs/plugin-rsc/vendor/react-server-dom/client.browser',
            },
          },
        }
      },
    },
  ],
})
