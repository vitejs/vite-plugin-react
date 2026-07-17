import { testAction } from './action'

export function CachedContent() {
  return (
    <form action={testAction}>
      <button type="submit">Invoke replayed action</button>
    </form>
  )
}
