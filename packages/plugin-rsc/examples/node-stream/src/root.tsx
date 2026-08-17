import { getServerCount, incrementServerCount } from './action'
import { Counter } from './client'

export async function Root(props: { url: URL }) {
  const serverCount = await getServerCount()
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RSC Node Stream</title>
      </head>
      <body>
        <div id="root">
          <h1>RSC Node Stream</h1>
          <p data-testid="url">URL: {props.url?.pathname}</p>
          <Counter />
          <form action={incrementServerCount}>
            <button data-testid="server-counter">
              Server count: {serverCount}
            </button>
          </form>
        </div>
      </body>
    </html>
  )
}
