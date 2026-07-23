import { Page } from './routes/page'

export function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>Client-first RSC</title>
      </head>
      <body>
        <Page />
      </body>
    </html>
  )
}
