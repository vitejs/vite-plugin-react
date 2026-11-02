import { sharedProgressiveAction } from '../shared/action.tsx'
import { actionB } from './action.tsx'
import { ActionB } from './client.tsx'

export function Page() {
  return (
    <main>
      <h1>This is page "b"</h1>
      <ActionB />
      <form
        aria-label="Shared progressive action"
        action={sharedProgressiveAction.bind(null, actionB)}
      >
        <button>Run shared progressive action</button>
      </form>
    </main>
  )
}
