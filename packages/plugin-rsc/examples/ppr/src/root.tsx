import { setTimeout as delay } from 'node:timers/promises'
import { Suspense } from 'react'
import { Counter } from './counter'
import { createCachedComponent } from './framework/cache'
import { markDynamic } from './framework/prerender-context'
import './style.css'

export function getStaticPaths(): string[] {
  return ['/', '/about']
}

export function Root({ url }: { url: URL }) {
  const pageName = url.pathname === '/about' ? 'About' : 'Home'
  return (
    <CachedLayout>
      <p>This is the {pageName.toLowerCase()} page.</p>
      <div className="demo-box" style={{ background: '#00800010' }}>
        <h3>Cached async component</h3>
        <Suspense
          fallback={
            <pre data-testid="cached-fallback">
              [fallback: waiting for cached work...]
            </pre>
          }
        >
          <CachedAsyncContent />
        </Suspense>
      </div>
      <div className="demo-box" style={{ background: '#ff000010' }}>
        <h3>Request-time dynamic component</h3>
        <Suspense
          fallback={
            <pre data-testid="fallback">
              [fallback: waiting for dynamic work..]
            </pre>
          }
        >
          <DynamicContent url={url} />
        </Suspense>
      </div>
      <div className="demo-box" style={{ background: '#0000ff10' }}>
        <h3>Client component</h3>
        <Counter />
      </div>
    </CachedLayout>
  )
}

// This has "use cache" semantics, expressed as a decorator instead of a
// directive-based compiler transform.
const CachedLayout = createCachedComponent(Layout)
const CachedAsyncContent = createCachedComponent(AsyncContent)

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RSC Partial Prerendering</title>
      </head>
      <body>
        <main
          style={{
            border: '1px solid #00000030',
            padding: '1rem',
            margin: '1rem',
          }}
        >
          <h1>Static layout</h1>
          <pre data-testid="static">
            [rendered at {new Date().toISOString()}]
          </pre>
          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
            </ul>
          </nav>
          {children}
        </main>
      </body>
    </html>
  )
}

async function AsyncContent() {
  await delay(100)
  return (
    <pre data-testid="cached-static">
      [rendered at {new Date().toISOString()}]
    </pre>
  )
}

async function DynamicContent({ url }: { url: URL }) {
  await markDynamic()
  await delay(300)
  return (
    <pre data-testid="dynamic">
      Requested URL: {url.pathname} [rendered at {new Date().toISOString()}]
    </pre>
  )
}
