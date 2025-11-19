import { createFromFetch } from '@vitejs/plugin-rsc/browser'
import type { RscPayload } from './entry.rsc'
import { createRscRenderRequest } from './request'

// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router-instance.ts
// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router.tsx
export type NavigationState = {
  url: string
  push?: boolean
  payloadPromise: Promise<RscPayload>
}

/**
 * History state with unique key per entry (History API fallback)
 */
type HistoryState = null | {
  key?: string
}

/**
 * Navigation manager
 * Encapsulates all navigation logic: history interception, caching, transitions
 */
export class NavigationManager {
  private state: NavigationState
  private cache = new BackForwardCache<Promise<RscPayload>>()
  private setState!: (state: NavigationState) => void
  private startTransition?: (fn: () => void) => void
  // History API fallback
  private oldPushState = window.history.pushState
  private oldReplaceState = window.history.replaceState

  constructor(initialPayload: RscPayload) {
    this.state = {
      url: window.location.href,
      push: false,
      payloadPromise: Promise.resolve(initialPayload),
    }
    this.initializeHistoryState()
  }

  /**
   * Get current state
   */
  getState(): NavigationState {
    return this.state
  }

  /**
   * Connect router to React state handlers
   */
  setReactHandlers(
    setState: (state: NavigationState) => void,
    startTransition: (fn: () => void) => void,
  ) {
    this.setState = setState
    this.startTransition = startTransition
  }

  /**
   * Navigate to URL
   */
  navigate(url: string, push = false) {
    if (!this.setState || !this.startTransition) {
      throw new Error('NavigationManager not connected to React')
    }

    this.startTransition(() => {
      this.state = {
        url,
        push,
        payloadPromise: this.cache.run(() =>
          createFromFetch<RscPayload>(fetch(createRscRenderRequest(url))),
        ),
      }
      this.setState(this.state)
    })
  }

  /**
   * Handle server action result
   */
  handleServerAction(payload: RscPayload) {
    const payloadPromise = Promise.resolve(payload)
    this.cache.set(payloadPromise)
    if (!this.setState || !this.startTransition) return

    this.startTransition(() => {
      this.state = {
        url: window.location.href,
        push: false,
        payloadPromise,
      }
      this.setState(this.state)
    })
  }

  /**
   * Invalidate cache for current entry
   */
  invalidateCache() {
    this.cache.set(undefined)
  }

  /**
   * Commit history push (called from useInsertionEffect)
   * Only needed for History API fallback
   */
  commitHistoryPush(url: string) {
    this.state.push = false
    this.oldPushState.call(window.history, this.addStateKey({}), '', url)
  }

  /**
   * Setup navigation interception and listeners
   */
  listen(): () => void {
    // Intercept pushState
    window.history.pushState = (...args) => {
      args[0] = this.addStateKey(args[0])
      this.oldPushState.apply(window.history, args) // TODO: no. shouldn't commit url yet
      const url = new URL(args[2] || window.location.href, window.location.href)
      this.navigate(url.href, false) // push flag handled by commitHistoryPush
    }

    // Intercept replaceState
    window.history.replaceState = (...args) => {
      args[0] = this.addStateKey(args[0])
      this.oldReplaceState.apply(window.history, args) // TODO: no. shouldn't commit url yet
      const url = new URL(args[2] || window.location.href, window.location.href)
      this.navigate(url.href)
    }

    // Handle popstate (back/forward)
    const onPopstate = (e: PopStateEvent) => {
      // TODO: use state key from event to look up cache
      e.state.key
      this.navigate(window.location.href)
    }
    window.addEventListener('popstate', onPopstate)

    // Intercept link clicks
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest('a')
      if (
        link &&
        link instanceof HTMLAnchorElement &&
        link.href &&
        (!link.target || link.target === '_self') &&
        link.origin === location.origin &&
        !link.hasAttribute('download') &&
        e.button === 0 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !e.defaultPrevented
      ) {
        e.preventDefault()
        window.history.pushState({}, '', link.href)
      }
    }
    document.addEventListener('click', onClick)

    // Cleanup
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPopstate)
      window.history.pushState = this.oldPushState
      window.history.replaceState = this.oldReplaceState
    }
  }

  /**
   * Initialize history state with key if not present (History API only)
   */
  private initializeHistoryState() {
    if (!(window.history.state as HistoryState)?.key) {
      this.oldReplaceState.call(
        window.history,
        this.addStateKey(window.history.state),
        '',
        window.location.href,
      )
    }
  }

  // https://github.com/TanStack/router/blob/05941e5ef2b7d2776e885cf473fdcc3970548b22/packages/history/src/index.ts
  private addStateKey(state: any): HistoryState {
    const key = Math.random().toString(36).slice(2)
    return { ...state, key }
  }
}

/**
 * Back/Forward cache keyed by navigation entry
 *
 * Uses Navigation API's built-in keys when available,
 * falls back to History API state keys
 */
class BackForwardCache<T> {
  private cache: Record<string, T> = {}

  run(fn: () => T): T {
    const key = this.getCurrentKey()
    if (typeof key === 'string') {
      return (this.cache[key] ??= fn())
    }
    return fn()
  }

  set(value: T | undefined) {
    const key = this.getCurrentKey()
    if (typeof key === 'string') {
      if (value === undefined) {
        delete this.cache[key]
      } else {
        this.cache[key] = value
      }
    }
  }

  /**
   * Get current entry key
   * Uses Navigation API when available, falls back to History API
   */
  private getCurrentKey(): string | undefined {
    return (window.history.state as HistoryState)?.key
  }
}
