import assert from 'node:assert'
import { createServer, isRunnableDevEnvironment, type Connect } from 'vite'
// @ts-ignore
import connect from 'connect'
import { createRequestListener } from '@remix-run/node-fetch-server'

async function main() {
  const viteServer = await createServer({
    server: { middlewareMode: true },
    rsc: { serverHandler: false },
  })

  assert(isRunnableDevEnvironment(viteServer.environments.rsc))
  const runner = viteServer.environments.rsc.runner

  const app = connect() as Connect.Server

  app.use(viteServer.middlewares)

  app.use(async (req, res, next) => {
    try {
      const entry = await runner.import<typeof import('./entry.rsc')>(
        '/src/framework/entry.rsc.tsx',
      )
      await createRequestListener(entry.default)(req, res)
    } catch (e) {
      next(e)
    }
  })

  app.listen(3000, () => {
    console.log('listening on http://localhost:3000')
  })
  app.on('error', (err) => {
    console.error(err)
  })
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
