import { useState } from 'react'

export const App = () => {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>count is {count}</button>
}
