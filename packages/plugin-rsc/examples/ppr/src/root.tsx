import './styles.css'
import { Suspense } from 'react'
import { StaticHeader } from './static-header.tsx'
import { DynamicContent } from './dynamic-content.tsx'
import { DynamicUserWidget } from './dynamic-user.tsx'

export function Root(props: { url: URL }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Vite + RSC + PPR</title>
      </head>
      <body>
        {/* Static shell - prerendered at build time with PPR */}
        <StaticHeader />

        <main className="container">
          <section className="static-section">
            <h2>Static Content (Prerendered)</h2>
            <p>
              This content is part of the static shell and is prerendered at
              build time using React's Partial Prerendering (PPR) feature.
            </p>
            <p>
              PPR allows mixing static and dynamic content in a single page. The
              static parts are sent immediately, while dynamic parts stream in
              as they become ready.
            </p>
          </section>

          {/* Dynamic content wrapped in Suspense - streamed at runtime */}
          <section className="dynamic-section">
            <h2>Dynamic Content (Streamed)</h2>
            <Suspense
              fallback={<div className="skeleton">Loading user...</div>}
            >
              <DynamicUserWidget />
            </Suspense>

            <Suspense
              fallback={<div className="skeleton">Loading content...</div>}
            >
              <DynamicContent url={props.url} />
            </Suspense>
          </section>

          <section className="info-section">
            <h2>How PPR Works</h2>
            <ol>
              <li>
                <strong>Static Shell:</strong> The outer HTML structure, header,
                and static text are prerendered immediately
              </li>
              <li>
                <strong>Suspense Boundaries:</strong> Components wrapped in
                Suspense are replaced with fallbacks in the static shell
              </li>
              <li>
                <strong>Dynamic Streaming:</strong> The actual dynamic content
                streams in as it resolves, replacing the fallbacks
              </li>
            </ol>
            <p>
              View the{' '}
              <a href="?__rsc" target="_blank">
                RSC payload
              </a>{' '}
              to see the serialized component structure.
            </p>
          </section>
        </main>
      </body>
    </html>
  )
}
