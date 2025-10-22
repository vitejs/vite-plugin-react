import * as ReactServer from '@vitejs/plugin-rsc/rsc'
import * as ReactDOMServer from 'react-dom/server'
import type { ReactFormState } from 'react-dom/client'
import { injectRscStreamToHtml } from 'rsc-html-stream/server'

export async function renderHTML(
  rscStream: ReadableStream,
  options: {
    formState?: ReactFormState
    debugNojs?: boolean
  },
): Promise<ReadableStream> {
  const [rscStream1, rscStream2] = rscStream.tee()

  // Deserialize RSC stream to React elements for SSR
  const root = await ReactServer.createFromNodeStream(
    rscStream1,
    {},
    { clientManifest: import.meta.viteRsc.clientManifest },
  )

  // Render to HTML stream
  const htmlStream = await ReactDOMServer.renderToReadableStream(root, {
    formState: options.formState,
    bootstrapModules: options.debugNojs
      ? []
      : [import.meta.viteRsc.clientManifest.entryModule],
  })

  // Inject RSC stream into HTML for client hydration
  const mergedStream = injectRscStreamToHtml(htmlStream, rscStream2)

  return mergedStream
}
