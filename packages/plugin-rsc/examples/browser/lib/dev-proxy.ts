import { createRPCClient } from 'vite-dev-rpc'
import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'

const rpcClient = createRPCClient<{ invoke: Function }, {}>(
  'rsc:transport-proxy',
  import.meta.hot!,
)

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

export default new Proxy(
  {},
  {
    get(_target, p, _receiver) {
      return async (...args: any[]) => {
        const module = await runner.import('/src/framework/entry.rsc')
        return module.default[p](...args)
      }
    },
  },
)
