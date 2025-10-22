import {
  ESModulesEvaluator,
  ModuleRunner,
  createWebSocketModuleRunnerTransport,
} from 'vite/module-runner'

export default async function loadClient() {
  const runner = new ModuleRunner(
    {
      sourcemapInterceptor: false,
      transport: createWebSocketModuleRunnerTransport({
        createConnection: () => {
          const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
          const url = `${protocol}://${location.host}/@vite-react-client`
          return new WebSocket(url)
        },
      }),
      hmr: false,
    },
    new ESModulesEvaluator(),
  )
  return await runner.import<typeof import('./entry.browser')>(
    '/src/framework/entry.browser.tsx',
  )
}
