import { serverReferenceSourceLocation } from './action'
import { Client } from './client'

export function Root(_props: { url: URL }) {
  return (
    <html>
      <body>
        <Client action={serverReferenceSourceLocation} />
      </body>
    </html>
  )
}
