import { ClientError } from './features/client-error/client'
import { ConsoleReplay } from './features/console-replay/server'
import { Defaults } from './features/defaults/server'
import { InlineDirective } from './features/inline-directive/server'
import { MultipleExports } from './features/multiple-exports/server'
import { NamedFunction } from './features/named-function/server'
import { ServerActionError } from './features/server-action-error/server'
import { ServerComponentError } from './features/server-component-error/server'
import { ServerFunctionName } from './features/server-function-name/server'
import { ServerReferenceFromClient } from './features/server-reference-from-client/server'
import { Specifiers } from './features/specifiers/server'
import { TypescriptTsx } from './features/typescript-tsx/server'
import { Variables } from './features/variables/server'

const routes = [
  {
    path: '/named-function',
    title: 'Named function',
    description:
      'A Server Reference received from the server, used as the automated baseline.',
    render: () => <NamedFunction />,
  },
  {
    path: '/server-reference-from-client',
    title: 'Server Reference from client',
    description:
      'A Client Component imports a Server Function through its generated proxy.',
    render: () => <ServerReferenceFromClient />,
  },
  {
    path: '/variables',
    title: 'Variables',
    description: 'Async arrow and function-expression variable exports.',
    render: () => <Variables />,
  },
  {
    path: '/defaults',
    title: 'Default exports',
    description: 'Named, anonymous, and identifier default export forms.',
    render: () => <Defaults />,
  },
  {
    path: '/specifiers',
    title: 'Export specifiers',
    description:
      'Local aliases, re-exports, and expanded export-all declarations.',
    render: () => <Specifiers />,
  },
  {
    path: '/inline-directive',
    title: 'Inline directive',
    description:
      'Declaration, captured arrow, and direct function-expression directives hoisted from a Server Component.',
    render: () => <InlineDirective />,
  },
  {
    path: '/typescript-tsx',
    title: 'TypeScript and TSX',
    description:
      'TypeScript and JSX transforms composed with Server Function lowering.',
    render: () => <TypescriptTsx />,
  },
  {
    path: '/multiple-exports',
    title: 'Multiple exports',
    description: 'Two generated registrations from one module.',
    render: () => <MultipleExports />,
  },
  {
    path: '/server-function-name',
    title: 'Server Function names',
    description:
      'Module-level and inline Server Functions preserve their source names in stack traces.',
    render: () => <ServerFunctionName />,
  },
  {
    path: '/server-action-error',
    title: 'Server Action error',
    description:
      'An inline Server Action throws so its server stack can be inspected in the browser.',
    render: () => <ServerActionError />,
  },
  {
    path: '/server-component-error',
    title: 'Server Component error',
    description:
      'Client navigation triggers a Server Component error with a transported server stack.',
    render: (url: URL) => <ServerComponentError url={url} />,
  },
  {
    path: '/console-replay',
    title: 'Console replay',
    description:
      'A server console call is replayed in the browser with its server source location.',
    render: () => <ConsoleReplay />,
  },
  {
    path: '/client-error',
    title: 'Client error',
    description: 'A normal Client Component error provides a browser baseline.',
    render: () => <ClientError />,
  },
]

export function Root({ url }: { url: URL }) {
  const route = routes.find((item) => item.path === url.pathname)

  return (
    <html>
      <head>
        <title>React Source Maps</title>
      </head>
      <body>
        <h1>React Source Maps</h1>
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
          {route ? (
            <>
              <p>{route.description}</p>
              {route.render(url)}
            </>
          ) : (
            <p>Select an example.</p>
          )}
        </main>
      </body>
    </html>
  )
}
