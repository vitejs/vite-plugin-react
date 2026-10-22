import { Links, Meta, Outlet } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body>{children}</body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
