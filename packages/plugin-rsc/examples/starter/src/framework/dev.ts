import assert from 'node:assert'
import { createServer, isRunnableDevEnvironment } from 'vite'

async function main() {
  const viteServer = await createServer({
    server: { middlewareMode: true },
    rsc: { serverHandler: false },
  })
  assert(isRunnableDevEnvironment(viteServer.environments.rsc))
  const entry = await viteServer.environments.rsc.runner.import<
    typeof import('./entry.rsc')
  >('/src/framework/entry.rsc.tsx')
  entry.default

  viteServer
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
