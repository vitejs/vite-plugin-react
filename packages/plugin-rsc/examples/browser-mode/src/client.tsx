'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

export function ClientCounter() {
  const pathname = usePathname()
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount((count) => count + 1)}>
      Client Counter: {count} <br />
      Injected pathname: {pathname}
    </button>
  )
}
