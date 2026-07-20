import { setTimeout as delay } from 'node:timers/promises'
import { Suspense } from 'react'
import { Counter } from './counter'
import { createCachedComponent } from './framework/cache'
import { suspendDuringPrerender } from './framework/ppr-context'

export function Root({ url }: { url: URL }) {
  return (
    <CachedLayout>
      <Suspense
        fallback={<p data-testid="fallback">Loading request data...</p>}
      >
        <DynamicContent url={url} />
      </Suspense>
      <Counter />
      <p>
        <a href={url.search ? '/' : '/?navigation=1'}>Navigate with RSC</a>
      </p>
    </CachedLayout>
  )
}

// This has "use cache" semantics, expressed as a decorator instead of a
// directive-based compiler transform.
const CachedLayout = createCachedComponent(Layout)

function Layout({ children }: { children: React.ReactNode }) {
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
          <p data-testid="static">Static shell: {new Date().toISOString()}</p>
          {children}
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
