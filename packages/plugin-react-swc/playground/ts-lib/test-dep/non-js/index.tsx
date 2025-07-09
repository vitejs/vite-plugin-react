import React from 'react'

export default function TestNonJs() {
  const [count, setCount] = React.useState(0)
  return (
    <button data-testid="test-non-js" onClick={() => setCount(count + 1)}>
      test-non-js: {count}
    </button>
  )
}
