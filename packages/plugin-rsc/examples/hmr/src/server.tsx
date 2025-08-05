import * as ReactServer from '@vitejs/plugin-rsc/rsc'
import App from './App.tsx'

export default async function handler(request: Request): Promise<Response> {
  const root = <App />
  const rscStream = ReactServer.renderToReadableStream({ root })
  if (request.method !== 'GET') {
    return new Response(rscStream, {
      headers: { 'Content-type': 'text/x-component' },
    })
  }
  const ssrEntryModule = await import.meta.viteRsc.loadModule<
    typeof import('./server.ssr.tsx')
  >('ssr', 'index')
  const htmlStream = await ssrEntryModule.renderHTML(rscStream)
  return new Response(htmlStream, { headers: { 'Content-type': 'text/html' } })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
