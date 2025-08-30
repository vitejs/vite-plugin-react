import { defaultClientConditions, defineConfig, type Plugin } from 'vite'
import {
  vitePluginRscMinimal,
  getPluginApi,
  type PluginApi,
} from '@vitejs/plugin-rsc/plugin'
// import inspect from 'vite-plugin-inspect'

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

  return [
    ...vitePluginRscMinimal({
      environment: {
        rsc: 'client',
        browser: 'react_client',
      },
    }),
    {
      name: 'rsc-browser-mode',
      config(_config, env) {
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
        }
      },
      configResolved(config) {
        manager = getPluginApi(config)!.manager
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'https://any.local')
          if (url.pathname === '/@vite/invoke-react-client') {
            const payload = JSON.parse(url.searchParams.get('data')!)
            const result =
              await server.environments['react_client']!.hot.handleInvoke(
                payload,
              )
            res.setHeader('Content-Type', 'application/json')
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
      resolveId: {
        order: 'pre',
        handler(source) {
          // strip `vite/module-runner` during build
          if (
            source === 'vite/module-runner' &&
            this.environment.mode === 'build'
          ) {
            return '\0virtual:empty'
          }
          // swap react-client loader during build
          if (source === 'virtual:vite-rsc-browser-mode:load_client_build') {
            if (this.environment.mode === 'dev' || manager.isScanBuild) {
              return '\0virtual:empty'
            }
            return this.resolve('/dist/react_client/index.js')
          }
        },
      },
      load(id) {
        if (id === '\0virtual:empty') {
          return `module.exports = {}`
        }
      },
    },
    {
      name: 'rsc-browser-mode:build-client-references',
      resolveId(source) {
        if (source === 'virtual:vite-rsc-minimal/client-references') {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-minimal/client-references') {
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
        if (source === 'virtual:vite-rsc-minimal/server-references') {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc-minimal/server-references') {
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
