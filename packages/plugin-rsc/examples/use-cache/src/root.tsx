import { CachedComponent } from './features/cached-component/server'
import { CachedFunction } from './features/cached-function/server'
import { CapturedValues } from './features/captured-values/server'

export function Root(_props: { url: URL }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>RSC use cache</title>
      </head>
      <body>
        <h1>RSC use cache</h1>
        <p>
          These examples show how arguments, dynamic children, and captured
          values interact with a cached function.
        </p>
        <main>
          <section>
            <h2>Cached function</h2>
            <p>
              Call the function repeatedly with the same cache key. Calls
              increase every time, while executions increase only on a cache
              miss.
            </p>
            <CachedFunction />
          </section>
          <section>
            <h2>Cached component</h2>
            <p>
              Reload the page. The cached timestamp stays the same, while the
              dynamic child gets a new timestamp.
            </p>
            <CachedComponent />
          </section>
          <section>
            <h2>Captured values</h2>
            <p>
              Both the value captured by the inner function and its argument
              participate in the cache key.
            </p>
            <CapturedValues />
          </section>
        </main>
      </body>
    </html>
  )
}
