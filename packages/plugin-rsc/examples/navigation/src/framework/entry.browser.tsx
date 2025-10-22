import {
  createFromReadableStream,
  createFromFetch,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import type { RscPayload } from './entry.rsc'

/**
 * This example demonstrates coordinating history navigation with React transitions
 * and caching RSC payloads by history entry.
 *
 * Key features:
 * 1. Back/forward navigation is instant via cache (no loading state)
 * 2. Cache is keyed by history state, not URL
 * 3. Server actions invalidate cache for current entry
 * 4. All navigation logic consolidated in Router class
 *
 * Pattern inspired by:
 * https://github.com/hi-ogawa/vite-environment-examples/blob/main/examples/react-server
 */

async function main() {
  // Deserialize initial RSC stream from SSR
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  // Create router instance
  const router = new Router(initialPayload)

  // Browser root component
  function BrowserRoot() {
    const [state, setState] = React.useState(router.getState())
    const [isPending, startTransition] = React.useTransition()

    // Connect router to React state
    React.useEffect(() => {
      router.setReactHandlers(setState, startTransition)
      return router.listen()
    }, [])

    return (
      <>
        {state.push && <HistoryUpdater url={state.url} />}
        <TransitionStatus isPending={isPending} />
        <RenderState state={state} />
      </>
    )
  }

  /**
   * Updates history via useInsertionEffect
   */
  function HistoryUpdater({ url }: { url: string }) {
    React.useInsertionEffect(() => {
      router.commitHistoryPush(url)
    }, [url])
    return null
  }

  /**
   * Visual indicator for pending transitions
   */
  function TransitionStatus(props: { isPending: boolean }) {
    React.useEffect(() => {
      let el = document.querySelector('#pending') as HTMLDivElement
      if (!el) {
        el = document.createElement('div')
        el.id = 'pending'
        el.style.position = 'fixed'
        el.style.bottom = '10px'
        el.style.right = '10px'
        el.style.padding = '8px 16px'
        el.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
        el.style.color = 'white'
        el.style.borderRadius = '4px'
        el.style.fontSize = '14px'
        el.style.fontFamily = 'monospace'
        el.style.transition = 'opacity 0.3s ease-in-out'
        el.style.pointerEvents = 'none'
        el.style.zIndex = '9999'
        document.body.appendChild(el)
      }

      if (props.isPending) {
        el.textContent = 'loading...'
        el.style.opacity = '1'
      } else {
        el.style.opacity = '0'
      }
    }, [props.isPending])
    return null
  }

  /**
   * Renders the current navigation state
   */
  function RenderState({ state }: { state: NavigationState }) {
    const payload = React.use(state.payloadPromise)
    return payload.root
  }

  // Register server callback for server actions
  setServerCallback(async (id, args) => {
    const url = new URL(window.location.href)
    const temporaryReferences = createTemporaryReferenceSet()
    const payload = await createFromFetch<RscPayload>(
      fetch(url, {
        method: 'POST',
        body: await encodeReply(args, { temporaryReferences }),
        headers: {
          'x-rsc-action': id,
        },
      }),
      { temporaryReferences },
    )
    router.handleServerAction(payload)
    return payload.returnValue
  })

  // Hydrate root
  hydrateRoot(
    document,
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>,
    { formState: initialPayload.formState },
  )

  // HMR support
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      router.invalidateCache()
      router.navigate(window.location.href)
    })
  }
}

/**
 * Navigation state shape
 */
type NavigationState = {
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
class Router {
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

main()
