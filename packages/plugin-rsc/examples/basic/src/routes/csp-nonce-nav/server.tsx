import React from 'react'

// each client component is its own client chunk with its own css,
// which the browser loads only when a client navigation renders it
const TestCspNonceNavClient1 = React.lazy(() => import('./client1'))
const TestCspNonceNavClient2 = React.lazy(() => import('./client2'))

export function TestCspNonceNav(props: { url: URL }) {
  const step = props.url.searchParams.get('test-csp-nonce-nav')
  return (
    <div data-testid="test-csp-nonce-nav">
      <a href="?test-csp-nonce-nav=1">test-csp-nonce-nav-1</a>{' '}
      <a href="?test-csp-nonce-nav=2">test-csp-nonce-nav-2</a>{' '}
      {step === '1' && <TestCspNonceNavClient1 />}
      {step === '2' && <TestCspNonceNavClient2 />}
    </div>
  )
}
