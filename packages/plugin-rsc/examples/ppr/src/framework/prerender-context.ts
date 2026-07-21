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
  if (!state || state.pendingWork.has(work)) {
    return work
  }
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
 * Calling this from tracked cache work would leave that cache fill pending and
 * prevent prerender readiness. A production framework can detect the cache
 * scope and report the invalid dynamic access as a usage error.
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
  // Readiness combines two independent facts: a dynamic boundary proves that
  // the unfinished render is intentionally partial, while an empty pending set
  // proves that no discovered cache fill can add more static output. A fully
  // static render need not reach this state because its result completes first.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8381-L8490
  // https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/shims/ppr-fallback-shell.ts#L80-L120
  while (true) {
    while (!state.dynamicReached || state.pendingWork.size > 0) {
      await new Promise<void>((resolve) => state.listeners.add(resolve))
    }
    // Let React retry settled cache reads and discover follow-on fills before
    // the entry aborts the pass, then recheck both readiness conditions.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    if (state.dynamicReached && state.pendingWork.size === 0) return
  }
}

function notify(state: PrerenderState): void {
  for (const listener of state.listeners) {
    listener()
  }
  state.listeners.clear()
}
