import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { actionState } from './action-state'

export async function Root(props: { url: URL }) {
  const cacheFile = resolve('.flight-cache')
  let cachedContent: React.ReactNode
  if (props.url.pathname === '/cache') {
    const { CachedContent } = await import('./cached-content')
    cachedContent = <CachedContent />
    const stream = renderToReadableStream(cachedContent)
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    await writeFile(cacheFile, bytes)
  } else if (props.url.pathname === '/read-cache') {
    const bytes = await readFile(cacheFile)
    cachedContent = await createFromReadableStream<React.ReactNode>(
      new Blob([bytes]).stream(),
    )
  } else if (props.url.pathname === '/read-cache-preserve') {
    const bytes = await readFile(cacheFile)
    cachedContent = await createFromReadableStream<React.ReactNode>(
      new Blob([bytes]).stream(),
      {},
      { preserveServerReferences: true },
    )
  } else if (props.url.pathname === '/delete-cache') {
    await rm(cacheFile, { force: true })
  }

  return (
    <html>
      <body>
        <h1>Persisted Flight server reference</h1>
        <nav>
          <a href="/">Home</a> | <a href="/cache">Cache content</a> |{' '}
          <a href="/read-cache">Read cache</a> |{' '}
          <a href="/read-cache-preserve">Read cache and preserve references</a>{' '}
          | <a href="/delete-cache">Delete cache</a>
        </nav>
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
        <p>
          Cache file exists:{' '}
          <output data-testid="cache-exists">
            {String(existsSync(cacheFile))}
          </output>
        </p>
        {cachedContent}
      </body>
    </html>
  )
}
