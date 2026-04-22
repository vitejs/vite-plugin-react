import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h1>bundledDev + base path</h1>
      <button id="state-button" onClick={() => setCount((c) => c + 1)}>
        count is: {count}
      </button>
    </div>
  )
}

export default App
