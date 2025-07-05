'use client'

import React from 'react'

export function Component() {
  const [count, setCount] = React.useState(0)

  return (
    <main className="container my-8 px-8 mx-auto">
      <article className="paper prose max-w-none">
        <h1>About</h1>
        <p>This is the about page.</p>
        <p className="test-style-home">[test-style-home]</p>
        <button className="btn" onClick={() => setCount((c) => c + 1)}>
          Client counter: {count}
        </button>
      </article>
    </main>
  )
}
