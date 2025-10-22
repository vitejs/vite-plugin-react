import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'

const runner = new ModuleRunner(
  {
    sourcemapInterceptor: false,
    transport: {
      invoke: async (payload) => {
        const response = await fetch(
          '/@vite/invoke-rsc?' +
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

export default new Proxy(
  {},
  {
    get(_target, p, _receiver) {
      return async (...args: any[]) => {
        const module = await runner.import('/src/framework/entry.rsc.tsx')
        return module.default[p](...args)
      }
    },
  },
)
