'use client'

import React from 'react'

export function Counter() {
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount((c) => c + 1)}>Count is {count}</button>
  )
}
