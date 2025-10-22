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
 * History state with unique key per entry (History API fallback)
 */
type HistoryState = null | {
  key?: string
}

/**
 * Feature detection for Navigation API
 */
const supportsNavigationAPI = 'navigation' in window

/**
 * Navigation manager
 * Encapsulates all navigation logic: history interception, caching, transitions
 *
 * Uses modern Navigation API when available, falls back to History API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export class NavigationManager {
  private state: NavigationState
  private cache = new BackForwardCache<Promise<RscPayload>>()
  private setState?: (state: NavigationState) => void
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
    if (!supportsNavigationAPI) {
      this.initializeHistoryState()
    }
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
   * Only needed for History API fallback
   */
  commitHistoryPush(url: string) {
    if (supportsNavigationAPI) return

    this.state.push = false
    this.oldPushState.call(window.history, this.addStateKey({}), '', url)
  }

  /**
   * Setup navigation interception and listeners
   */
  listen(): () => void {
    // Use modern Navigation API if available
    if (supportsNavigationAPI) {
      return this.listenNavigationAPI()
    }
    // Fallback to History API
    return this.listenHistoryAPI()
  }

  /**
   * Setup listeners using modern Navigation API
   * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
   */
  private listenNavigationAPI(): () => void {
    const onNavigate = (e: NavigateEvent) => {
      // Skip non-interceptable navigations (e.g., cross-origin)
      if (!e.canIntercept) {
        return
      }

      // Skip if navigation is to same URL
      if (e.destination.url === window.location.href) {
        return
      }

      // Skip external links
      const url = new URL(e.destination.url)
      if (url.origin !== location.origin) {
        return
      }

      // Intercept navigation
      e.intercept({
        handler: async () => {
          // Navigation API automatically updates URL, no need for push flag
          this.navigate(url.href, false)
        },
      })
    }

    window.navigation.addEventListener('navigate', onNavigate as any)

    return () => {
      window.navigation.removeEventListener('navigate', onNavigate as any)
    }
  }

  /**
   * Setup listeners using History API (fallback for older browsers)
   */
  private listenHistoryAPI(): () => void {
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

  /**
   * Add unique key to history state (History API only)
   */
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
    if (supportsNavigationAPI && window.navigation.currentEntry) {
      return window.navigation.currentEntry.key
    }
    return (window.history.state as HistoryState)?.key
  }
}
