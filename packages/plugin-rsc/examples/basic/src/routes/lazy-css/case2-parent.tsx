// Case 2: server component -> lazy client component with CSS
import * as React from 'react'

const LazyChild = React.lazy(() => import('./case2-child'))

export function TestLazyCssServerToClient() {
  return (
    <div data-testid="test-lazy-css-case2">
      <React.Suspense fallback={<span>loading...</span>}>
        <LazyChild />
      </React.Suspense>
    </div>
  )
}
