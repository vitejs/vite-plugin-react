// @ts-ignore
import connect from 'connect'
import { createRequestListener } from '@remix-run/node-fetch-server'
import type { Connect } from 'vite'
import sirv from 'sirv'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function main() {
  const app = connect() as Connect.Server

  const entry = (await import(
    pathToFileURL(path.resolve('dist/rsc/index.js')).href
  )) as typeof import('./entry.rsc.js')
  const entryHandler = createRequestListener(entry.default)

  // https://github.com/vitejs/vite/blob/84079a84ad94de4c1ef4f1bdb2ab448ff2c01196/packages/vite/src/node/preview.ts#L237
  app.use(
    sirv('./dist/client', {
      etag: true,
      dev: true,
      extensions: [],
      ignores: false,
    }),
  )

  app.use(async (req, res, next) => {
    try {
      await entryHandler(req, res)
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
