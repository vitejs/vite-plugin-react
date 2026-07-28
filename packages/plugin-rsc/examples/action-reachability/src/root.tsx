import { getRoute } from './framework/routes.tsx'

export function Root(props: { url: URL }) {
  const { Page } = getRoute(props.url.pathname)
  return (
    <html lang="en">
      <body>
        <Page />
      </body>
    </html>
  )
}
