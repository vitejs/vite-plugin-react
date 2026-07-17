import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { actionState } from './action-state'

export async function Root(props: { url: URL }) {
  let cachedContent: React.ReactNode
  if (props.url.pathname === '/cache') {
    const { CachedContent } = await import('./cached-content')
    cachedContent = <CachedContent />
    const stream = renderToReadableStream(cachedContent)
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    await writeFile(resolve('.flight-cache'), bytes)
  } else {
    const bytes = await readFile(resolve('.flight-cache'))
    cachedContent = await createFromReadableStream<React.ReactNode>(
      new Blob([bytes]).stream(),
      {},
      { preserveServerReferences: true },
    )
  }

  return (
    <html>
      <body>
        <h1>Persisted Flight server reference</h1>
        <p>
          Action imported in the RSC environment:{' '}
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
        {cachedContent}
      </body>
    </html>
  )
}
