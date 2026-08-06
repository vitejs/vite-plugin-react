import { CachedComponent } from './features/cached-component/server'
import { CachedFunction } from './features/cached-function/server'
import { CapturedValues } from './features/captured-values/server'

const routes = [
  {
    path: '/cached-function',
    title: 'Cached function',
    description:
      'Call the function repeatedly with the same cache key. Calls increase every time, while executions increase only on a cache miss.',
    Component: CachedFunction,
  },
  {
    path: '/cached-component',
    title: 'Cached component',
    description:
      'Reload the page. The cached timestamp stays the same, while the dynamic child gets a new timestamp.',
    Component: CachedComponent,
  },
  {
    path: '/captured-values',
    title: 'Captured values',
    description:
      'Both the value captured by the inner function and its argument participate in the cache key.',
    Component: CapturedValues,
  },
]

export function Root({ url }: { url: URL }) {
  const route = routes.find((item) => item.path === url.pathname)
  const Example = route?.Component

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
        <nav aria-label="Examples">
          <ul>
            {routes.map((item) => (
              <li key={item.path}>
                <a
                  href={item.path}
                  aria-current={route === item ? 'page' : undefined}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main>
          {route && Example ? (
            <>
              <h2>{route.title}</h2>
              <p>{route.description}</p>
              <Example />
            </>
          ) : (
            <p>Select an example.</p>
          )}
        </main>
      </body>
    </html>
  )
}
