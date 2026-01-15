'use client'

// Case 1: client component -> lazy client component -> CSS
import * as React from 'react'

const LazyChild = React.lazy(() => import('./case1-child'))

export function TestLazyCssClientToClient() {
  return (
    <div data-testid="test-lazy-css-case1">
      <React.Suspense fallback={<span>loading...</span>}>
        <LazyChild />
      </React.Suspense>
    </div>
  )
}
