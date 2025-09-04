import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function main() {
  const command = process.argv[2]

  if (command === 'dev') {
    const { createServer, isRunnableDevEnvironment } = await import('vite')
    const server = await createServer({
      clearScreen: false,
      server: { middlewareMode: true },
      rsc: { serverHandler: false },
    })
    assert(isRunnableDevEnvironment(server.environments.rsc))
    const runner = server.environments.rsc.runner
    const entry = (await runner.import(
      '/src/framework/main.ts',
    )) as typeof import('./main')
    // TODO: how to restart?
    const app = await entry.createApp(server)
    app.listen(3000, () => {
      console.log('listening on http://localhost:3000')
    })
    app.on('error', (err) => {
      console.error(err)
    })
  } else if (command === 'start') {
    const entry = (await import(
      pathToFileURL(path.resolve('dist/rsc/main.js')).href
    )) as typeof import('./main')
    const app = await entry.createApp()
    app
  } else {
    console.error(`Unknown command: ${command}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
