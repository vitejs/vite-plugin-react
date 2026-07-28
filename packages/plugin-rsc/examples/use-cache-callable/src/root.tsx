import { FileDirectiveFromClient } from './features/file-directive-from-client/client'
import { FileDirectiveFromServer } from './features/file-directive-from-server/server'
import { InlineDirective } from './features/inline-directive/server'

export function Root(_props: { url: URL }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>RSC callable use cache</title>
      </head>
      <body>
        <h1>RSC callable use cache</h1>
        <InlineDirective />
        <FileDirectiveFromServer />
        <FileDirectiveFromClient />
      </body>
    </html>
  )
}
