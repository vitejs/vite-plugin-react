import * as server from './entry.rsc'

async function main() {
  const client = await (import.meta.env.DEV
    ? loadClientDev()
    : loadClientBuild())
  server.initialize()
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

async function loadClientDev() {
  const { ESModulesEvaluator, ModuleRunner } = await import(
    'vite/module-runner'
  )
  const runner = new ModuleRunner(
    {
      sourcemapInterceptor: false,
      transport: {
        invoke: async (payload) => {
          const response = await fetch(
            '/@vite/invoke-react-client?' +
              new URLSearchParams({
                data: JSON.stringify(payload),
              }),
          )
          return response.json()
        },
      },
      hmr: false,
    },
    new ESModulesEvaluator(),
  )
  return await runner.import<typeof import('./entry.browser')>(
    '/src/framework/entry.browser.tsx',
  )
}

async function loadClientBuild(): Promise<typeof import('./entry.browser')> {
  return import('virtual:vite-rsc-browser-mode:load_client_build' as any)
}

main()
