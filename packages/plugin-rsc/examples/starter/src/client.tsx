'use client'

import React from 'react'

export function ClientCounter() {
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount((count) => count + 1)}>
      Client Counter: {count}
    </button>
  )
}

const promise = Promise.resolve('ok')

export function TestClientUse() {
  const value = React.use(promise)
  console.log(value)
  return <span>TestClientUse: {value}</span>
}
