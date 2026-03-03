import { useState } from 'react'

export default function TestComponent() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h1 id="test-package-title">Test Package</h1>
      <button id="state-button" onClick={() => setCount(count + 1)}>
        count is: {count}
      </button>
    </div>
  )
}
