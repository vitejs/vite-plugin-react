import { FileDirectiveFromServer } from './features/file-directive-from-server/server'
import { ProtectedCaptures } from './features/protected-captures/server'

const routes = [
  {
    path: '/file-directive-from-server',
    title: 'File directive from server',
    description:
      'A cached module export is imported by a server component and passed to a client component.',
    Component: FileDirectiveFromServer,
  },
  {
    path: '/protected-captures',
    title: 'Protected captures',
    description:
      'This inline cached function transports encrypted captures while using their decoded values for cache identity.',
    Component: ProtectedCaptures,
  },
]

export function Root({ url }: { url: URL }) {
  const route = routes.find((item) => item.path === url.pathname)
  const Example = route?.Component

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>RSC persistent use cache</title>
      </head>
      <body>
        <h1>RSC persistent use cache</h1>
        <p>
          Submit the same cache key twice. Submissions increase on every call,
          while executions increase only on a cache miss.
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
