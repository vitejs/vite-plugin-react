import { boundProgressiveActionA, progressiveActionA } from './action.tsx'
import { ActionA } from './client.tsx'

export function Page() {
  return (
    <main>
      <h1>This is page "a"</h1>
      <ActionA />
      <form aria-label="Unbound progressive action" action={progressiveActionA}>
        <button>Run unbound progressive action</button>
      </form>
      <form
        aria-label="Bound progressive action"
        action={boundProgressiveActionA.bind(null, 'bound')}
      >
        <button>Run bound progressive action</button>
      </form>
    </main>
  )
}
