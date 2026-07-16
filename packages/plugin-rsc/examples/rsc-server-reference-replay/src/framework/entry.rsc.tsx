import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createFromReadableStream,
  decodeAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { wasActionImported } from '../action-import-state'
import { Root } from '../root'

const cacheFile = resolve('.flight-cache')

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'POST') {
    const action = await decodeAction(await request.formData())
    await action()
  }

  let bytes: Uint8Array
  if (url.pathname === '/cache') {
    const { CachedContent } = await import('../cached-content')
    const stream = renderToReadableStream(<CachedContent />)
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    await writeFile(cacheFile, bytes)
  } else {
    try {
      bytes = await readFile(cacheFile)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new Response('Visit /cache before replaying the saved Flight.', {
          status: 404,
        })
      }
      throw error
    }
  }

  const cachedContent = await createFromReadableStream<React.ReactNode>(
    toReadableStream(bytes),
    {},
    { preserveServerReferences: true },
  )
  const rscStream = renderToReadableStream({
    root: (
      <Root
        actionImported={wasActionImported()}
        cachedContent={cachedContent}
      />
    ),
  })
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const htmlStream = await ssr.renderHtml(rscStream)
  return new Response(htmlStream, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  })
}

function toReadableStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

export default { fetch: handler }
