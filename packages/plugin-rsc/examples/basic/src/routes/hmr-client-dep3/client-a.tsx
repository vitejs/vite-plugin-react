'use client'

import { clientDep } from './client-dep'
import { ClientDepComp } from './client-dep-comp'
import React from 'react'

export function TestHmrClientDepA() {
  const [count, setCount] = React.useState(0)
  return (
    <>
      <span data-testid="test-hmr-client-dep3">
        <button onClick={() => setCount((c) => c + 1)}>
          test-hmr-client-dep3: {count}
        </button>
        {clientDep()}
        <ClientDepComp />
      </span>
    </>
  )
}
