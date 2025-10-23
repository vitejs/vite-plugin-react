import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'

const runner = new ModuleRunner(
  {
    sourcemapInterceptor: false,
    transport: {
      connect(handlers) {
        import.meta.hot!.on('transport-proxy:onMessage', (payload) => {
          handlers.onMessage(payload)
        })
      },
      send(payload) {
        import.meta.hot!.send('transport-proxy:send', payload)
      },
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
