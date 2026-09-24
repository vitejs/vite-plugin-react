import React from 'react'

// Static imports put both client references in one group, so keep separate
// dynamic imports to exercise shared CSS across client-reference chunks.
const TestSharedClientCss1 = React.lazy(() => import('./client1'))
const TestSharedClientCss2 = React.lazy(() => import('./client2'))

export function TestSharedClientCss() {
  return (
    <div data-testid="shared-client-css">
      <TestSharedClientCss1 />
      <TestSharedClientCss2 />
    </div>
  )
}
