import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'
import * as server from './entry.rsc'

async function main() {
  const client = await importClient()
  server.initialize()
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

async function importClient() {
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

main()
