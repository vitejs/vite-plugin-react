'use client'

import React from 'react'

export function Counter() {
  const [count, setCount] = React.useState(0)
  return (
    <button
      data-testid="counter"
      onClick={() => setCount((value) => value + 1)}
    >
      Count is {count}
    </button>
  )
}
