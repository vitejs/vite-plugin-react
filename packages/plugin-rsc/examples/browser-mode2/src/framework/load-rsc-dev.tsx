import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'

export default async function loadRsc() {
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
  return await runner.import<typeof import('./entry.rsc')>(
    '/src/framework/entry.rsc.tsx',
  )
}
