import { defaultClientConditions, defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  vitePluginRscMinimal,
  getPluginApi,
  type PluginApi,
} from '@vitejs/plugin-rsc/plugin'

export default defineConfig({
  plugins: [react(), rscBrowserMode2Plugin()],
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
    ...vitePluginRscMinimal({
      environment: {
        rsc: 'rsc',
        browser: 'client',
      },
    }),
    {
      name: 'rsc-browser-mode2',
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
                conditions: [...defaultClientConditions],
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
              },
              build: {
                outDir: 'dist/client',
              },
            },
            rsc: {
              keepProcessEnv: false,
              resolve: {
                conditions: ['react-server', ...defaultClientConditions],
                noExternal: true,
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react-dom',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge',
                ],
                exclude: ['@vitejs/plugin-rsc'],
                esbuildOptions: {
                  platform: 'browser',
                },
              },
              build: {
                outDir: 'dist/rsc',
                copyPublicDir: false,
                emitAssets: true,
                rollupOptions: {
                  input: {
                    'entry.rsc': './src/framework/entry.rsc.tsx',
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
            rollupOptions: {
              onwarn(warning, defaultHandler) {
                if (
                  warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                  (warning.message.includes('use client') ||
                    warning.message.includes('use server'))
                ) {
                  return
                }
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
      hotUpdate(ctx) {
        if (this.environment.name === 'rsc') {
          if (ctx.modules.length > 0) {
            ctx.server.environments.client.hot.send({
              type: 'custom',
              event: 'rsc:update',
            })
          }
        }
      },
      async buildApp(builder) {
        const rscEnv = builder.environments.rsc!
        const clientEnv = builder.environments.client!
        manager.isScanBuild = true
        rscEnv.config.build.write = false
        await builder.build(rscEnv)
        manager.isScanBuild = false
        rscEnv.config.build.write = true
        await builder.build(rscEnv)
        await builder.build(clientEnv)
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
            return `export default async () => {
              return await import("/dist/rsc/entry.rsc.js")
            }`
          }
        }
      },
    },
  ]
}
