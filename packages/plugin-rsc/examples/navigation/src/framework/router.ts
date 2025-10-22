import { createFromFetch } from '@vitejs/plugin-rsc/browser'
import type { RscPayload } from './entry.rsc'

/**
 * Navigation state shape
 */
export type NavigationState = {
  url: string
  push?: boolean
  payloadPromise: Promise<RscPayload>
}

/**
 * History state with unique key per entry
 */
type HistoryState = null | {
  key?: string
}

/**
 * Consolidated navigation router
 * Encapsulates all navigation logic: history interception, caching, transitions
 */
export class Router {
  private state: NavigationState
  private cache = new BackForwardCache<Promise<RscPayload>>()
  private setState?: (state: NavigationState) => void
  private startTransition?: (fn: () => void) => void
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
      throw new Error('Router not connected to React')
    }

    this.startTransition(() => {
      this.state = {
        url,
        push,
        payloadPromise: this.cache.run(() =>
          createFromFetch<RscPayload>(fetch(url)),
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
   */
  commitHistoryPush(url: string) {
    this.state.push = false
    this.oldPushState.call(window.history, this.addStateKey({}), '', url)
  }

  /**
   * Setup history interception and listeners
   */
  listen(): () => void {
    // Intercept pushState
    window.history.pushState = (...args) => {
      args[0] = this.addStateKey(args[0])
      this.oldPushState.apply(window.history, args)
      const url = new URL(args[2] || window.location.href, window.location.href)
      this.navigate(url.href, false) // push flag handled by commitHistoryPush
    }

    // Intercept replaceState
    window.history.replaceState = (...args) => {
      args[0] = this.addStateKey(args[0])
      this.oldReplaceState.apply(window.history, args)
      const url = new URL(args[2] || window.location.href, window.location.href)
      this.navigate(url.href)
    }

    // Handle popstate (back/forward)
    const onPopstate = () => {
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
   * Initialize history state with key if not present
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

  /**
   * Add unique key to history state
   */
  private addStateKey(state: any): HistoryState {
    const key = Math.random().toString(36).slice(2)
    return { ...state, key }
  }
}

/**
 * Back/Forward cache keyed by history state
 */
class BackForwardCache<T> {
  private cache: Record<string, T> = {}

  run(fn: () => T): T {
    const key = (window.history.state as HistoryState)?.key
    if (typeof key === 'string') {
      return (this.cache[key] ??= fn())
    }
    return fn()
  }

  set(value: T | undefined) {
    const key = (window.history.state as HistoryState)?.key
    if (typeof key === 'string') {
      if (value === undefined) {
        delete this.cache[key]
      } else {
        this.cache[key] = value
      }
    }
  }
}
