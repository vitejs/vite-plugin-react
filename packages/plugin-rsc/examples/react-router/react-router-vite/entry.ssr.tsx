import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import { renderToReadableStream as renderHTMLToReadableStream } from 'react-dom/server.edge'
import {
  unstable_routeRSCServerRequest as routeRSCServerRequest,
  unstable_RSCStaticRouter as RSCStaticRouter,
} from 'react-router'

// pass serializable values (via turbo-stream) to ssr environment.
// passing entire `request` and `fetchServer` are not necessary since `routeRSCServerRequest` works like this
// https://github.com/remix-run/react-router/blob/20d8307d4a51c219f6e13e0b66461e7162d944e4/packages/react-router/lib/rsc/server.ssr.tsx#L95-L102

export async function generateHTML(
  url: string,
  headers: Headers,
  rscResponse: Response,
): Promise<Response> {
  return await routeRSCServerRequest({
    // The incoming request.
    request: new Request(url, { headers }),
    // How to call the React Server.
    fetchServer: async () => rscResponse,
    // Provide the React Server touchpoints.
    createFromReadableStream,
    // Render the router to HTML.
    async renderHTML(getPayload) {
      const payload = await getPayload()
      const formState =
        payload.type === 'render' ? await payload.formState : undefined

      const bootstrapScriptContent =
        await import.meta.viteRsc.loadBootstrapScriptContent('index')

      return await renderHTMLToReadableStream(
        <RSCStaticRouter getPayload={getPayload} />,
        {
          bootstrapScriptContent,
          // @ts-expect-error - no types for this yet
          formState,
        },
      )
    },
  })
}
