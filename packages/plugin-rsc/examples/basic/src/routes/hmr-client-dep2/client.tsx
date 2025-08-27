'use client'

import React from 'react'
import { clientDep } from './client-dep'

export function TestHmrClientDep2() {
  const [count, setCount] = React.useState(0)
  return (
    <div data-testid="test-hmr-client-dep2">
      <button onClick={() => setCount((c) => c + 1)}>
        test-hmr-client-dep2: {count}
      </button>
      {clientDep()} <a href="?test-hmr-client-dep2-re-render">re-render</a>
    </div>
  )
}
