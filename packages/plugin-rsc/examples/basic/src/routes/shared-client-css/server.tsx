import React from 'react'

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
