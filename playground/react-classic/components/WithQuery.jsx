import React, { useState } from 'react'

export default function WithQuery() {
  const [count, setCount] = useState(0)
  return (
    <>
      <div id="WithQuery">With Query</div>
      <button
        id="WithQuery-button"
        onClick={() => setCount((count) => count + 1)}
      >
        count is: {count}
      </button>
    </>
  )
}
