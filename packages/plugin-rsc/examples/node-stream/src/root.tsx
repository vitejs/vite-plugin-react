import { Counter } from './client.tsx'

export function Root(props: { url: URL }) {
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
        </div>
      </body>
    </html>
  )
}
