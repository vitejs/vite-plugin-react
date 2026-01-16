// Case 2: server component -> lazy client component with CSS
import * as React from 'react'

const LazyChild = React.lazy(() => import('./server-to-client-child'))

export function TestLazyCssServerToClient() {
  return (
    <div data-testid="test-lazy-css-server-to-client">
      <React.Suspense fallback={<span>loading...</span>}>
        <LazyChild />
      </React.Suspense>
    </div>
  )
}
