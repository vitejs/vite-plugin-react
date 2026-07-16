import { replayedAction } from './action'

export function CachedContent() {
  return (
    <form action={replayedAction}>
      <button type="submit">Invoke replayed action</button>
    </form>
  )
}
