export function Root(props: { children?: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <p>Save action A on /a, navigate to /b, then run the saved action.</p>
        <nav>
          <ul>
            <li>
              <a href="/a">/a</a>
            </li>
            <li>
              <a href="/b">/b</a>
            </li>
            <li>
              <a href="/c">/c</a>
            </li>
          </ul>
        </nav>
        {props.children}
      </body>
    </html>
  )
}
