import { createRequestListener } from '@remix-run/node-fetch-server'
// @ts-ignore
import connect from 'connect'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sirv from 'sirv'
import type { Connect } from 'vite'

async function main() {
  const app = connect() as Connect.Server
  const command = process.argv[2]
  if (command === 'dev') {
    const { createServer } = await import('vite')
    const server = await createServer({
      clearScreen: false,
      server: { middlewareMode: true },
    })
    app.use(server.middlewares)
  } else if (command === 'start') {
    app.use(
      sirv('./dist/client', {
        etag: true,
        dev: true,
        extensions: [],
        ignores: false,
      }),
    )
    const entry = await import(
      pathToFileURL(path.resolve('dist/rsc/index.js')).href
    )
    app.use(createRequestListener(entry.default))
  } else {
    console.error(`Unknown command: ${command}`)
    process.exitCode = 1
    return
  }

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server started at http://localhost:${port}`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
