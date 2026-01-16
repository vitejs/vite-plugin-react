import { useState } from 'react'
import { renderToString } from 'react-dom/server'

// SSR-only: useState and renderToString are not available in RSC environment

function ClientComponent() {
  const [state] = useState('test-ssr')
  return <span>{state}</span>
}

export function testSsrModule(): string {
  return renderToString(<ClientComponent />)
}
