export function Root(props: { children?: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/a">/a</a> <a href="/b">/b</a>
        </nav>
        {props.children}
      </body>
    </html>
  )
}
