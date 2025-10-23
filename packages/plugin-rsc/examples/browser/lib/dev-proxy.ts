import {
  ESModulesEvaluator,
  ModuleRunner,
  createWebSocketModuleRunnerTransport,
} from 'vite/module-runner'

const runner = new ModuleRunner(
  {
    sourcemapInterceptor: false,
    // transport: {
    //   invoke: async (payload) => {
    //     const response = await fetch(
    //       '/@vite/invoke-rsc?' +
    //         new URLSearchParams({
    //           data: JSON.stringify(payload),
    //         }),
    //     )
    //     return response.json()
    //   },
    // },
    transport: createWebSocketModuleRunnerTransport({
      createConnection() {
        return new WebSocket(
          `ws://${location.host}/@vite/module-runner-transport/rsc`,
        )
      },
    }),
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
