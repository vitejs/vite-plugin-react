// @ts-ignore
import connect from 'connect'
import type { Connect, ViteDevServer } from 'vite'
import sirv from 'sirv'
import handler from './entry.rsc.tsx'
import { createRequestListener } from '@remix-run/node-fetch-server'

export async function createApp(viteDevServer?: ViteDevServer) {
  const app = connect() as Connect.Server

  if (viteDevServer) {
    app.use(viteDevServer.middlewares)
  } else {
    // https://github.com/vitejs/vite/blob/84079a84ad94de4c1ef4f1bdb2ab448ff2c01196/packages/vite/src/node/preview.ts#L237
    app.use(
      sirv('./dist/client', {
        etag: true,
        dev: true,
        extensions: [],
        ignores: false,
      }),
    )
  }

  const handlerListener = createRequestListener(handler)
  app.use(async (req, res, next) => {
    try {
      await handlerListener(req, res)
    } catch (e) {
      next(e)
    }
  })

  return app
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
