import { AsyncLocalStorage } from 'node:async_hooks'

type PrerenderState = {
  dynamicReached: boolean
  listeners: Set<() => void>
  pendingWork: Set<Promise<unknown>>
}

const prerenderStorage = new AsyncLocalStorage<PrerenderState>()
const pending = new Promise<never>(() => {})

export function runWithPrerenderContext<T>(callback: () => T): {
  result: T
  ready: Promise<void>
} {
  const state: PrerenderState = {
    dynamicReached: false,
    listeners: new Set(),
    pendingWork: new Set(),
  }
  return {
    result: prerenderStorage.run(state, callback),
    ready: waitForReady(state),
  }
}

export function trackPrerenderWork<T>(work: Promise<T>): Promise<T> {
  const state = prerenderStorage.getStore()
  if (!state || state.pendingWork.has(work)) return work
  state.pendingWork.add(work)
  work.then(
    () => {
      state.pendingWork.delete(work)
      notify(state)
    },
    () => {
      state.pendingWork.delete(work)
      notify(state)
    },
  )
  return work
}

/**
 * Marks the following work as request-time. Await this before reading request
 * data: it remains pending during prerender and returns immediately otherwise.
 */
export function markDynamic(): Promise<never> | undefined {
  const state = prerenderStorage.getStore()
  if (state) {
    state.dynamicReached = true
    notify(state)
    return pending
  }
}

async function waitForReady(state: PrerenderState): Promise<void> {
  while (true) {
    while (!state.dynamicReached || state.pendingWork.size > 0) {
      await new Promise<void>((resolve) => state.listeners.add(resolve))
    }
    // Let React observe the settled cache work before the entry aborts the pass.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    if (state.dynamicReached && state.pendingWork.size === 0) return
  }
}

function notify(state: PrerenderState): void {
  for (const listener of state.listeners) listener()
  state.listeners.clear()
}
