import { setTimeout as delay } from 'node:timers/promises'
import { Suspense } from 'react'
import { Counter } from './counter'
import { suspendDuringPrerender } from './framework/ppr-context'

export function Root({ url, timestamp }: { url: URL; timestamp: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RSC Partial Prerendering</title>
      </head>
      <body>
        <main>
          <h1>RSC Partial Prerendering</h1>
          <p data-testid="static">Static shell: {timestamp}</p>
          <Suspense
            fallback={<p data-testid="fallback">Loading request data...</p>}
          >
            <DynamicContent url={url} />
          </Suspense>
          <Counter />
          <p>
            <a href={url.search ? '/' : '/?navigation=1'}>Navigate with RSC</a>
          </p>
        </main>
      </body>
    </html>
  )
}

function DynamicContent({ url }: { url: URL }) {
  suspendDuringPrerender()
  return <RequestContent url={url} />
}

async function RequestContent({ url }: { url: URL }) {
  await delay(100)
  return (
    <p data-testid="dynamic">
      Request data: {url.search || '(none)'} at {new Date().toISOString()}
    </p>
  )
}
