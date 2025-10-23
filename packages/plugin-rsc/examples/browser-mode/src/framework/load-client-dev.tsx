import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'
import { createRPCClient } from 'vite-dev-rpc'

const rpcClient = createRPCClient<{ invoke: Function }, {}>(
  'transport-proxy',
  import.meta.hot!,
)

export default async function loadClient() {
  const runner = new ModuleRunner(
    {
      sourcemapInterceptor: false,
      transport: {
        invoke: (payload) => rpcClient.invoke(payload),
      },
      hmr: false,
    },
    new ESModulesEvaluator(),
  )
  return await runner.import<typeof import('./entry.browser')>(
    '/src/framework/entry.browser.tsx',
  )
}
