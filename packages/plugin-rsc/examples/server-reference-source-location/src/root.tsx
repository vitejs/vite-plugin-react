import { Defaults } from './features/defaults/server'
import { InlineDirective } from './features/inline-directive/server'
import { MultipleExports } from './features/multiple-exports/server'
import { NamedFunction } from './features/named-function/server'
import { Specifiers } from './features/specifiers/server'
import { TypescriptTsx } from './features/typescript-tsx/server'
import { Variables } from './features/variables/server'

const routes = [
  {
    path: '/named-function',
    title: 'Named function',
    description:
      'A direct named function export used as the automated baseline.',
    Component: NamedFunction,
  },
  {
    path: '/variables',
    title: 'Variables',
    description: 'Async arrow and function-expression variable exports.',
    Component: Variables,
  },
  {
    path: '/defaults',
    title: 'Default exports',
    description: 'Named, anonymous, and identifier default export forms.',
    Component: Defaults,
  },
  {
    path: '/specifiers',
    title: 'Export specifiers',
    description:
      'Local aliases, re-exports, and expanded export-all declarations.',
    Component: Specifiers,
  },
  {
    path: '/inline-directive',
    title: 'Inline directive',
    description:
      'An inline directive function hoisted from a Server Component.',
    Component: InlineDirective,
  },
  {
    path: '/typescript-tsx',
    title: 'TypeScript and TSX',
    description:
      'TypeScript and JSX transforms composed with Server Function lowering.',
    Component: TypescriptTsx,
  },
  {
    path: '/multiple-exports',
    title: 'Multiple exports',
    description: 'Two generated registrations from one module.',
    Component: MultipleExports,
  },
]

export function Root({ url }: { url: URL }) {
  const route = routes.find((item) => item.path === url.pathname)
  const Example = route?.Component

  return (
    <html>
      <head>
        <title>Server Reference Source Locations</title>
      </head>
      <body>
        <h1>Server Reference Source Locations</h1>
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
