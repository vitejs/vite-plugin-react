import { CallableCacheClient } from './client'

let implementationCalls = 0

export function Root() {
  const captured = 'captured'

  async function cachedAction(argument: string) {
    'use cache'
    implementationCalls++
    return `${captured}:${argument}:${implementationCalls}`
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>RSC callable use cache</title>
      </head>
      <body>
        <h1>RSC callable use cache</h1>
        <CallableCacheClient action={cachedAction} />
      </body>
    </html>
  )
}
