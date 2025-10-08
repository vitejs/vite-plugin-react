'use client'

import React from 'react'
import marked from 'marked'

export function ClientCounter() {
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount((count) => count + 1)}>
      Client Counter: {count}
      <div
        dangerouslySetInnerHTML={{
          __html: marked.parse('## hello world'),
        }}
      />
    </button>
  )
}
