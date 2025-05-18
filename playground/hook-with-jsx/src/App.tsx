import { useButtonHook } from './useButtonHook.tsx'

export function App() {
  const button = useButtonHook()
  return <div>{button}</div>
}
