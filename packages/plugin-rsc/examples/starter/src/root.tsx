import './index.css' // css import is automatically injected in exported server components
import viteLogo from '/vite.svg'
import { getServerCounter, updateServerCounter } from './action.tsx'
import reactLogo from './assets/react.svg'
import { ClientCounter } from './client.tsx'

export function Root(props: { url: URL }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Vite + RSC</title>
      </head>
      <body>
        <App {...props} />
      </body>
    </html>
  )
}

function App(props: { url: URL }) {
  const pathname = props.url.pathname

  return (
    <div id="root">
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev/reference/rsc/server-components"
          target="_blank"
        >
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + RSC</h1>

      {/* Navigation demo for testing improved client-side navigation */}
      <div
        className="card"
        style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
      >
        <a
          href="/"
          style={{ fontWeight: pathname === '/' ? 'bold' : 'normal' }}
        >
          Home
        </a>
        <a
          href="/page1"
          style={{ fontWeight: pathname === '/page1' ? 'bold' : 'normal' }}
        >
          Page 1
        </a>
        <a
          href="/page2"
          style={{ fontWeight: pathname === '/page2' ? 'bold' : 'normal' }}
        >
          Page 2
        </a>
      </div>

      <div className="card">
        <h2>Current Page: {pathname === '/' ? 'Home' : pathname}</h2>
      </div>

      <div className="card">
        <ClientCounter />
      </div>
      <div className="card">
        <form action={updateServerCounter.bind(null, 1)}>
          <button>Server Counter: {getServerCounter()}</button>
        </form>
      </div>
      <div className="card">Request URL: {props.url?.href}</div>
      <ul className="read-the-docs">
        <li>
          Edit <code>src/client.tsx</code> to test client HMR.
        </li>
        <li>
          Edit <code>src/root.tsx</code> to test server HMR.
        </li>
        <li>
          Visit{' '}
          <a href="?__rsc" target="_blank">
            <code>?__rsc</code>
          </a>{' '}
          to view RSC stream payload.
        </li>
        <li>
          Visit{' '}
          <a href="?__nojs" target="_blank">
            <code>?__nojs</code>
          </a>{' '}
          to test server action without js enabled.
        </li>
        <li>
          Test improved client-side navigation with back/forward buttons after
          clicking the page links above.
        </li>
      </ul>
    </div>
  )
}
