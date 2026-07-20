import { setTimeout as delay } from 'node:timers/promises'
import { Suspense } from 'react'
import { Counter } from './counter'
import { suspendDuringPrerender } from './framework/ppr-context'

export function Root({ url }: { url: URL }) {
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
          {/*
            React resume skips nodes already emitted in the prelude, so this
            build-time value stays static. The request-time tree must still
            preserve the component names, keys, and paths to postponed slots.
            https://github.com/facebook/react/blob/main/packages/react-server/src/ReactFizzServer.js
          */}
          <p data-testid="static">Static shell: {new Date().toISOString()}</p>
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
