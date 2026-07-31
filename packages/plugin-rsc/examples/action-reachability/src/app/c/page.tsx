import { boundProgressiveActionC, progressiveActionC } from './action.tsx'

export function Page() {
  return (
    <main>
      <h1>This is page "c"</h1>
      <form aria-label="Unbound progressive action" action={progressiveActionC}>
        <button>Run unbound progressive action</button>
      </form>
      <form
        aria-label="Bound progressive action"
        action={boundProgressiveActionC.bind(null, 'bound')}
      >
        <button>Run bound progressive action</button>
      </form>
    </main>
  )
}
