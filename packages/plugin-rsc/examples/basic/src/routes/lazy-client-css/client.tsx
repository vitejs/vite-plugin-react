'use client'

import * as React from 'react'

// React.lazy for SSR-ing lazy client component
const LazyDep = React.lazy(() => import('./lazy-dep'))

export function TestLazyClientCss() {
  return (
    <div data-testid="test-lazy-client-css">
      <React.Suspense fallback={<span>lazy-loading...</span>}>
        <LazyDep />
      </React.Suspense>
    </div>
  )
}
