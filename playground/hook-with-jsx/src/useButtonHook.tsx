import { useState } from 'react'

export function useButtonHook() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
}
