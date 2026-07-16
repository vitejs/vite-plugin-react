import { decodeAction, renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { Root } from '../root'

async function handler(request: Request): Promise<Response> {
  if (request.method === 'POST') {
    const action = await decodeAction(await request.formData())
    await action()
  }

  const rscStream = renderToReadableStream({ root: <Root /> })
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.renderHtml(rscStream)
  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

export default { fetch: handler }
