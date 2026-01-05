'use client'

import React from 'react'

export function TestClientError() {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (count === 2) {
      throw new Error('Client error triggered')
    }
  }, [count])

  return (
    <button
      data-testid="test-client-error"
      onClick={() => {
        setCount((c) => c + 1)
      }}
    >
      test-client-error: {count}
    </button>
  )
}
