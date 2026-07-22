import { Suspense, type ReactNode } from 'react'
import './index.css'

export function Root({ url }: { url: URL }) {
  const isAbout = url.pathname === '/about'
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`${isAbout ? 'About' : 'Home'} | RSC performance track`}</title>
      </head>
      <body>
        <main>
          <nav aria-label="Main navigation">
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
          <h1>{isAbout ? 'About' : 'Home'}</h1>
          <p>
            {isAbout ? 'This is the about page.' : 'This is the home page.'}
          </p>
          <h2>Nested Suspense</h2>
          <section className="suspense-box outer">
            <h3>Outer component</h3>
            <Suspense key={url.pathname} fallback={<p>Loading...</p>}>
              <SlowServerComponent delay={300}>
                <p>SlowServerComponent resolved after 300ms</p>
                <section className="suspense-box inner">
                  <h3>Inner component</h3>
                  <Suspense fallback={<p>Loading...</p>}>
                    <SlowServerComponent delay={500}>
                      <p>SlowServerComponent resolved after 500ms</p>
                    </SlowServerComponent>
                  </Suspense>
                </section>
              </SlowServerComponent>
            </Suspense>
          </section>
        </main>
      </body>
    </html>
  )
}

// Awaits `delay` before rendering `children`. Because a child element is only
// rendered once its parent resolves, nesting these produces a sequential
// waterfall (slow, then slow again) in React's Server Components track rather
// than parallel spans.
async function SlowServerComponent({
  delay,
  children,
}: {
  delay: number
  children: ReactNode
}) {
  await new Promise((resolve) => setTimeout(resolve, delay))
  return children
}
