// Case 3: server component -> lazy server component with CSS
import * as React from 'react'

const LazyChild = React.lazy(() => import('./case3-child'))

export function TestLazyCssServerToServer() {
  return (
    <div data-testid="test-lazy-css-case3">
      <React.Suspense fallback={<span>loading...</span>}>
        <LazyChild />
      </React.Suspense>
    </div>
  )
}
