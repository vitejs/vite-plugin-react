import assert from 'node:assert'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function main() {
  const command = process.argv[2]

  if (command === 'dev') {
    const { createServer, isRunnableDevEnvironment } = await import('vite')
    const server = await createServer({
      server: { middlewareMode: true },
    })
    assert(isRunnableDevEnvironment(server.environments.rsc))
    const runner = server.environments.rsc.runner
    const entry = (await runner.import(
      '/src/framework/main.ts',
    )) as typeof import('./main')
    await entry.default(server)
  } else if (command === 'start') {
    const entry = (await import(
      pathToFileURL(path.resolve('dist/rsc/main.js')).href
    )) as typeof import('./main')
    await entry.default()
  } else {
    console.error(`Unknown command: ${command}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
