export function Root(props: { children?: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <p>Save action A on /a, navigate to /b, then run the saved action.</p>
        <nav>
          <a href="/a">/a</a> <a href="/b">/b</a>
        </nav>
        {props.children}
      </body>
    </html>
  )
}
