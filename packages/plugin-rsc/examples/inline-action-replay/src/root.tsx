import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { actionState } from './action-state'

export async function Root(props: {
  url: URL
  loadPage: () => Promise<React.ReactNode>
}) {
  const cacheFile = resolve('.flight-cache')
  let page: React.ReactNode
  if (props.url.pathname === '/cache') {
    page = await props.loadPage()
    const stream = renderToReadableStream(page)
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    await writeFile(cacheFile, bytes)
  } else if (props.url.pathname === '/replay') {
    const bytes = await readFile(cacheFile)
    page = await createFromReadableStream<React.ReactNode>(
      new Blob([bytes]).stream(),
      {},
      { preserveServerReferences: true },
    )
  }

  return (
    <html>
      <body>
        <h1>Prerendered inline server action</h1>
        <nav>
          <a href="/cache">Cache page</a> | <a href="/replay">Replay page</a>
        </nav>
        <p>
          Action module imported in the RSC environment:{' '}
          <output data-testid="action-imported">
            {String(actionState.imported)}
          </output>
        </p>
        <p>
          Action invoked:{' '}
          <output data-testid="action-invoked">
            {String(actionState.invoked)}
          </output>
        </p>
        <p>
          Runtime cache file exists:{' '}
          <output data-testid="cache-exists">
            {String(existsSync(cacheFile))}
          </output>
        </p>
        {page}
      </body>
    </html>
  )
}
