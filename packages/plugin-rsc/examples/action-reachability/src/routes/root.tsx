export function Root(props: { children?: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <p>
          Run delayed action A, then navigate to /b. It runs through /a
          middleware.
        </p>
        <nav>
          <a href="/a">/a</a> <a href="/b">/b</a>
        </nav>
        {props.children}
      </body>
    </html>
  )
}
