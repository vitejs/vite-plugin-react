import { AsyncLocalStorage } from 'node:async_hooks'

type PrerenderState = {
  listeners: Set<() => void>
  partialReached: boolean
  pendingWork: Set<Promise<unknown>>
  phase: PrerenderPhase
}

export type PrerenderPhase = 'prospective' | 'final'

const prerenderStorage = new AsyncLocalStorage<PrerenderState>()
const pending = new Promise<never>(() => {})

export function runWithPrerenderContext<T>(
  phase: PrerenderPhase,
  callback: () => T,
): {
  result: T
  ready: Promise<void>
} {
  const state: PrerenderState = {
    listeners: new Set(),
    partialReached: false,
    pendingWork: new Set(),
    phase,
  }
  return {
    result: prerenderStorage.run(state, callback),
    ready: waitForReady(state),
  }
}

export function trackPrerenderWork<T>(work: Promise<T>): Promise<T> {
  const state = prerenderStorage.getStore()
  if (!state || state.phase !== 'prospective' || state.pendingWork.has(work)) {
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

export function postponeFinalCacheMiss(): Promise<never> | undefined {
  const state = prerenderStorage.getStore()
  // The strict pass classifies an unexpected miss as outside the static shell
  // instead of turning final rendering into another cache-discovery pass.
  if (state?.phase === 'final') {
    state.partialReached = true
    notify(state)
    return pending
  }
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
    state.partialReached = true
    notify(state)
    return pending
  }
}

async function waitForReady(state: PrerenderState): Promise<void> {
  // Both phases wait until the render proves that its output is partial. A
  // fully static render completes naturally, so its result wins instead.
  while (!state.partialReached) {
    await new Promise<void>((resolve) => state.listeners.add(resolve))
  }

  if (state.phase === 'final') {
    // The final render gets one retry window for warm cache reads, but does not
    // wait for newly discovered fills. Its job is to capture what was made
    // static by the prospective pass, not to extend the static shell itself.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    return
  }

  // The prospective render remains alive until every discovered cache miss is
  // filled. This deliberately uses a more permissive cutoff than the final
  // render so it can discover static work without making its output canonical.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7905-L8080
  // https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/server/app-ppr-fallback-shell-render.ts#L28-L55
  while (true) {
    while (state.pendingWork.size > 0) {
      await new Promise<void>((resolve) => state.listeners.add(resolve))
    }
    // Let React retry settled cache reads and discover follow-on fills before
    // the entry aborts the pass, then recheck both readiness conditions.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    if (state.partialReached && state.pendingWork.size === 0) return
  }
}

function notify(state: PrerenderState): void {
  for (const listener of state.listeners) {
    listener()
  }
  state.listeners.clear()
}
