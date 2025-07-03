import { createFromReadableStream } from '@hiogawa/vite-rsc/ssr'
import * as ReactDomServer from 'react-dom/server.edge'
import {
  unstable_RSCStaticRouter as RSCStaticRouter,
  unstable_routeRSCServerRequest as routeRSCServerRequest,
} from 'react-router'

export default async function handler(
  request: Request,
  fetchServer: (request: Request) => Promise<Response>,
): Promise<Response> {
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')
  return routeRSCServerRequest({
    request,
    fetchServer,
    createFromReadableStream: (body) => createFromReadableStream(body),
    renderHTML(getPayload) {
      return ReactDomServer.renderToReadableStream(
        <RSCStaticRouter getPayload={getPayload} />,
        {
          bootstrapScriptContent,
        },
      )
    },
  })
}
