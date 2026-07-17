import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { actionState } from './action-state'
import { readFlight, readFlightPreserved, writeFlight } from './flight'
import { inlineActionState } from './inline-action-state'

export async function Root(props: {
  url: URL
  loadInlineContent: () => Promise<React.ReactNode>
}) {
  const cacheFile = resolve('.flight-cache')
  const inlineCacheFile = resolve('.flight-inline-cache')
  let cachedContent: React.ReactNode
  let cachedInlineContent: React.ReactNode
  if (props.url.pathname === '/cache') {
    const { CachedContent } = await import('./cached-content')
    cachedContent = <CachedContent />
    await writeFlight(cacheFile, cachedContent)
  } else if (props.url.pathname === '/read-cache') {
    cachedContent = await readFlight(cacheFile)
  } else if (props.url.pathname === '/read-cache-preserve') {
    cachedContent = await readFlightPreserved(cacheFile)
  } else if (props.url.pathname === '/delete-cache') {
    await rm(cacheFile, { force: true })
  } else if (props.url.pathname === '/cache-inline') {
    cachedInlineContent = await props.loadInlineContent()
    await writeFlight(inlineCacheFile, cachedInlineContent)
  } else if (props.url.pathname === '/read-inline-cache-preserve') {
    cachedInlineContent = await readFlightPreserved(inlineCacheFile)
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
          {' | '}
          <a href="/cache-inline">Cache inline action</a> |{' '}
          <a href="/read-inline-cache-preserve">Read inline action cache</a>
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
        <p>
          Inline action imported in the RSC environment:{' '}
          <output data-testid="inline-action-imported">
            {String(inlineActionState.imported)}
          </output>
        </p>
        <p>
          Inline action invoked:{' '}
          <output data-testid="inline-action-invoked">
            {String(inlineActionState.invoked)}
          </output>
        </p>
        <p>
          Inline cache file exists:{' '}
          <output data-testid="inline-cache-exists">
            {String(existsSync(inlineCacheFile))}
          </output>
        </p>
        {cachedContent}
        {cachedInlineContent}
      </body>
    </html>
  )
}
