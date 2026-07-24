import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { getServerMessage } from '../routes/page'

export default async function handler(request: Request) {
  const url = new URL(request.url)

  // handle rsc fetch calls by browser clients
  if (url.pathname === '/__rsc-function') {
    const id = request.headers.get('x-rsc-function-id')
    if (!id) return new Response('Missing RSC function id', { status: 400 })

    const args = (await request.json()) as unknown[]
    const stream = await executeRscFn(id, args)
    return new Response(stream, {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  // fully delegate to SSR
  const ssrEntry = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  return new Response(await ssrEntry.renderHtml(), {
    headers: { 'content-type': 'text/html' },
  })
}

// hard-coded RSC function registry for demo simplicity
// TODO: Replace this with a split-module resolver: encoded module IDs with lazy
// loading in dev, and a generated manifest in build.
const rscFunctions = { getServerMessage: getServerMessage.handler }

// The browser reaches this executor over HTTP, while SSR invokes it directly
// through Vite's RSC environment to avoid an internal HTTP round trip.
export async function executeRscFn(
  id: string,
  args: unknown[],
): Promise<ReadableStream<Uint8Array>> {
  const rscFn = rscFunctions[id as keyof typeof rscFunctions] as
    | ((...args: unknown[]) => unknown)
    | undefined
  if (!rscFn) {
    throw new Error(`Unknown RSC function: ${id}`)
  }

  const result = await rscFn(...args)
  return renderToReadableStream(result)
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
