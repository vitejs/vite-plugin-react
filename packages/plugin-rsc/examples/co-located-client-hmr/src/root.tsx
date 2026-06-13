import { ServerNote } from './routes/page'

// Server-rendered shell. Importing `ServerNote` from `./routes/page` puts that
// file into the `rsc` module graph, mirroring a route file that co-locates
// server-graph code with its client route component. The actual route
// component (`Page`) is NOT rendered here — it is mounted client-side into
// `#client-root` by the browser entry.
export function Root(props: { url: URL }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>plugin-rsc co-located client HMR</title>
      </head>
      <body>
        <div id="client-root" />
        <ServerNote />
        <div data-testid="request-url" hidden>
          {props.url?.href}
        </div>
      </body>
    </html>
  )
}
