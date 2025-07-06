import { renderRequest } from '@vitejs/plugin-rsc/extra/rsc'
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/rsc', (c) => {
  const el = (
    <div>
      <div>Hono!</div>
      <div>random: ${Math.random().toString(36).slice(2)}</div>
    </div>
  )
  // TODO: request is irrelevant
  return renderRequest(c.req.raw, el)
})

app.all('/', (c) => {
  return renderRequest(c.req.raw, <Document />)
})

function Document() {
  return (
    <html>
      <head>
        <title>vite-rsc</title>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  )
}

export default app.fetch
