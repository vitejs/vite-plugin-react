import { ActionFromClient } from './features/action-from-client/client.tsx'
import { MixedDirectives } from './features/mixed-directives/server.tsx'

export function Root(_props: { url: URL }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Custom Server Function</title>
      </head>
      <body>
        <MixedDirectives />
        <ActionFromClient />
      </body>
    </html>
  )
}
