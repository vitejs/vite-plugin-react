import React from 'react'

const TestSharedClientCss1 = React.lazy(() => import('./server1'))
const TestSharedClientCss2 = React.lazy(() => import('./server2'))

export function TestSharedClientCss() {
  return (
    <div data-testid="shared-client-css">
      <TestSharedClientCss1 />
      <TestSharedClientCss2 />
    </div>
  )
}
