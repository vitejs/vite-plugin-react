'use client'

// Case 1: client component -> lazy client component -> CSS
import * as React from 'react'

const LazyChild = React.lazy(() => import('./client-to-client-child'))

export function TestLazyCssClientToClient() {
  return (
    <div data-testid="test-lazy-css-client-to-client">
      <React.Suspense fallback={<span>loading...</span>}>
        <LazyChild />
      </React.Suspense>
    </div>
  )
}
