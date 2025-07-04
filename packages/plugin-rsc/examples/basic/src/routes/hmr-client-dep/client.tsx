'use client'

import React from 'react'
import { ClientDep } from './client-dep'

export function TestHmrClientDep() {
  const [count, setCount] = React.useState(0)
  return (
    <div data-testid="test-hmr-client-dep">
      <button onClick={() => setCount((c) => c + 1)}>
        test-hmr-client-dep: {count}
      </button>
      <ClientDep />
    </div>
  )
}
