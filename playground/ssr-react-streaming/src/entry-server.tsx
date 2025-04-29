import type { IncomingMessage, OutgoingMessage } from 'node:http'
import ReactDOMServer from 'react-dom/server'
import { Root } from './root'

export default async function handler(
  _req: IncomingMessage,
  res: OutgoingMessage,
) {
  const assets = await import('virtual:assets-manifest' as any)
  const htmlStream = ReactDOMServer.renderToPipeableStream(<Root />, {
    bootstrapModules: assets.default.bootstrapModules,
  })
  res.setHeader('content-type', 'text/html;charset=utf-8')
  htmlStream.pipe(res)
}
