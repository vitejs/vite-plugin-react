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
 * 4. Proper coordination of history updates with transitions
 *
 * Pattern inspired by:
 * https://github.com/hi-ogawa/vite-environment-examples/blob/main/examples/react-server
 */

let dispatch: (action: NavigationAction) => void

async function main() {
  // Deserialize initial RSC stream from SSR
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  // Initialize back/forward cache
  const bfCache = new BackForwardCache<Promise<RscPayload>>()

  const initialNavigationState: NavigationState = {
    payloadPromise: Promise.resolve(initialPayload),
    url: window.location.href,
    push: false,
  }

  // Browser root component that manages navigation state
  function BrowserRoot() {
    const [state, setState_] = React.useState(initialNavigationState)
    const [isPending, startTransition] = React.useTransition()

    // Setup dispatch function that coordinates navigation with transitions
    React.useEffect(() => {
      dispatch = (action: NavigationAction) => {
        startTransition(() => {
          setState_({
            url: action.url,
            push: action.push,
            payloadPromise: action.payload
              ? Promise.resolve(action.payload)
              : // Use cache: if cached, returns immediately (sync render!)
                // if not cached, creates fetch and caches it
                bfCache.run(() =>
                  createFromFetch<RscPayload>(fetch(action.url)),
                ),
          })
        })
      }
    }, [setState_])

    // Setup navigation listeners
    React.useEffect(() => {
      return listenNavigation()
    }, [])

    return (
      <>
        <HistoryUpdater state={state} />
        <TransitionStatus isPending={isPending} />
        <RenderState state={state} />
      </>
    )
  }

  /**
   * Visual indicator for pending transitions
   * Only shows when actually fetching (cache miss)
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
   * Uses React.use() to unwrap the payload promise
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
    const payloadPromise = Promise.resolve(payload)
    // Update cache for current history entry
    bfCache.set(payloadPromise)
    dispatch({ url: url.href, payload })
    return payload.returnValue
  })

  // Hydrate root
  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  hydrateRoot(document, browserRoot, {
    formState: initialPayload.formState,
  })

  // HMR support
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      // Invalidate cache for current entry on HMR
      bfCache.set(undefined)
      dispatch({ url: window.location.href })
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
 * Navigation action shape
 */
type NavigationAction = {
  url: string
  push?: boolean
  payload?: RscPayload
}

/**
 * History state with unique key per entry
 */
type HistoryState = null | {
  key?: string
}

// Save reference to original history methods
const oldPushState = window.history.pushState
const oldReplaceState = window.history.replaceState

/**
 * Back/Forward cache keyed by history state
 *
 * Each history entry gets a unique random key stored in history.state.
 * Cache maps key → value, enabling instant back/forward navigation.
 */
class BackForwardCache<T> {
  private cache: Record<string, T> = {}

  /**
   * Get cached value or run function to create it
   * If current history state has a key and it's cached, return cached value.
   * Otherwise run function, cache result, and return it.
   */
  run(fn: () => T): T {
    const key = (window.history.state as HistoryState)?.key
    if (typeof key === 'string') {
      return (this.cache[key] ??= fn())
    }
    return fn()
  }

  /**
   * Set value for current history entry
   * Used to update cache after server actions or to invalidate (set undefined)
   */
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

/**
 * Initialize history state with unique key if not present
 */
function initStateKey() {
  if (!(window.history.state as HistoryState)?.key) {
    oldReplaceState.call(
      window.history,
      addStateKey(window.history.state),
      '',
      window.location.href,
    )
  }
}

/**
 * Add unique key to history state
 */
function addStateKey(state: any): HistoryState {
  const key = Math.random().toString(36).slice(2)
  return { ...state, key }
}

/**
 * Component that updates browser history via useInsertionEffect
 * This ensures history updates happen AFTER the state update but BEFORE paint
 */
function HistoryUpdater({ state }: { state: NavigationState }) {
  React.useInsertionEffect(() => {
    if (state.push) {
      state.push = false
      oldPushState.call(window.history, addStateKey({}), '', state.url)
    }
  }, [state])

  return null
}

/**
 * Setup navigation interception with history state keys
 */
function listenNavigation() {
  // Initialize current history state with key
  initStateKey()

  // Intercept pushState
  window.history.pushState = function (...args) {
    args[0] = addStateKey(args[0])
    const res = oldPushState.apply(this, args)
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href, push: false }) // push already happened above
    return res
  }

  // Intercept replaceState
  window.history.replaceState = function (...args) {
    args[0] = addStateKey(args[0])
    const res = oldReplaceState.apply(this, args)
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href })
    return res
  }

  // Handle back/forward navigation
  function onPopstate() {
    const href = window.location.href
    dispatch({ url: href })
  }
  window.addEventListener('popstate', onPopstate)

  // Intercept link clicks
  function onClick(e: MouseEvent) {
    const link = (e.target as Element).closest('a')
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 && // left clicks only
      !e.metaKey && // open in new tab (mac)
      !e.ctrlKey && // open in new tab (windows)
      !e.altKey && // download
      !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault()
      history.pushState({}, '', link.href)
    }
  }
  document.addEventListener('click', onClick)

  // Cleanup
  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPopstate)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}

main()
