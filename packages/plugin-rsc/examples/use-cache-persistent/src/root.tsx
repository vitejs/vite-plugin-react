import { FileDirectiveFromServer } from './features/file-directive-from-server/server'

export function Root(_props: { url: URL }) {
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
        <main>
          <h2>File directive</h2>
          <p>
            A persistent cached module export is passed from a Server Component
            to a Client Component.
          </p>
          <FileDirectiveFromServer />
        </main>
      </body>
    </html>
  )
}
