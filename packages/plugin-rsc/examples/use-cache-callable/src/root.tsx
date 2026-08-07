import { FileDirectiveExtraArgumentsServer } from './features/file-directive-extra-arguments/server'
import { FileDirectiveFromClientServer } from './features/file-directive-from-client/server'
import { FileDirectiveFromServer } from './features/file-directive-from-server/server'
import { InlineDirectiveExtraArgumentsServer } from './features/inline-directive-extra-arguments/server'
import { InlineDirective } from './features/inline-directive/server'
import { ProtectedCaptures } from './features/protected-captures/server'
import { UseCacheInUseServerFromClientServer } from './features/use-cache-in-use-server-from-client/server'
import { UseCacheInUseServerFromServerServer } from './features/use-cache-in-use-server-from-server/server'
import { UseServerInUseCacheFromClientServer } from './features/use-server-in-use-cache-from-client/server'
import { UseServerInUseCacheFromServerServer } from './features/use-server-in-use-cache-from-server/server'

const routes = [
  {
    path: '/inline-directive',
    title: 'Inline directive',
    description:
      'This Server Component defines an inline cached function, captures a value, and passes the function to the client form.',
    Component: InlineDirective,
  },
  {
    path: '/file-directive-from-server',
    title: 'File directive from server',
    description:
      'A cached module export is imported by a server component and passed to a client component.',
    Component: FileDirectiveFromServer,
  },
  {
    path: '/file-directive-from-client',
    title: 'File directive from client',
    description:
      'A client component imports a cached module export through its generated proxy.',
    Component: FileDirectiveFromClientServer,
  },
  {
    path: '/file-directive-extra-arguments',
    title: 'File directive extra arguments',
    description:
      'A zero-parameter cached module export ignores FormData supplied by React.',
    Component: FileDirectiveExtraArgumentsServer,
  },
  {
    path: '/inline-directive-extra-arguments',
    title: 'Inline directive extra arguments',
    description:
      'A zero-parameter inline cached function ignores FormData supplied by React.',
    Component: InlineDirectiveExtraArgumentsServer,
  },
  {
    path: '/use-cache-in-use-server-from-client',
    title: 'Use cache in use server from client',
    description:
      'A Client Component imports an inline cached export from a server function module.',
    Component: UseCacheInUseServerFromClientServer,
  },
  {
    path: '/use-cache-in-use-server-from-server',
    title: 'Use cache in use server from server',
    description:
      'A Server Component passes an inline cached export from a server function module to a Client Component.',
    Component: UseCacheInUseServerFromServerServer,
  },
  {
    path: '/use-server-in-use-cache-from-client',
    title: 'Use server in use cache from client',
    description:
      'A Client Component imports an uncached inline server export from a cached function module.',
    Component: UseServerInUseCacheFromClientServer,
  },
  {
    path: '/use-server-in-use-cache-from-server',
    title: 'Use server in use cache from server',
    description:
      'A Server Component passes an uncached inline server export from a cached function module to a Client Component.',
    Component: UseServerInUseCacheFromServerServer,
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
        <title>RSC callable use cache</title>
      </head>
      <body>
        <h1>RSC callable use cache</h1>
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
