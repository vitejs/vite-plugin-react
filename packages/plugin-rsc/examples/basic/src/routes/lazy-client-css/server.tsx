import * as React from 'react'

// Server component lazy-loading a client component with CSS directly
const LazyClientDirect = React.lazy(() =>
  import('./client-direct').then((m) => ({
    default: m.TestLazyClientCssDirect,
  })),
)

// Server component lazy-loading a server component with CSS
const LazyServerDep = React.lazy(() => import('./lazy-server-dep'))

export function TestLazyClientCssServer() {
  return (
    <div data-testid="test-lazy-client-css-server">
      <React.Suspense fallback={<span>lazy-loading...</span>}>
        <LazyClientDirect />
      </React.Suspense>
    </div>
  )
}

export function TestLazyServerCss() {
  return (
    <div data-testid="test-lazy-server-css">
      <React.Suspense fallback={<span>lazy-loading...</span>}>
        <LazyServerDep />
      </React.Suspense>
    </div>
  )
}
