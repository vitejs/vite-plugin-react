import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Hello Vite + React</h1>
      <button id="state-button" onClick={() => setCount((count) => count + 1)}>
        count is: {count}
      </button>
    </>
  )
}
