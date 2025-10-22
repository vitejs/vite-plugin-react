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
 * This example demonstrates coordinating history navigation with React transitions.
 *
 * Key improvements over basic navigation:
 * 1. Uses dispatch pattern to coordinate navigation actions
 * 2. History updates happen via useInsertionEffect AFTER state updates
 * 3. Navigation state includes payloadPromise, url, and push flag
 * 4. React.use() unwraps the promise in render
 * 5. Provides visual feedback with transition status
 *
 * Based on Next.js App Router implementation:
 * https://github.com/vercel/next.js/blob/main/packages/next/src/client/components/app-router.tsx
 */

let dispatch: (action: NavigationAction) => void

async function main() {
  // Deserialize initial RSC stream from SSR
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

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
    // Inspired by Next.js action queue pattern:
    // https://github.com/vercel/next.js/blob/main/packages/next/src/client/components/use-action-queue.ts
    React.useEffect(() => {
      dispatch = (action: NavigationAction) => {
        startTransition(() => {
          setState_({
            url: action.url,
            push: action.push,
            payloadPromise: action.payload
              ? Promise.resolve(action.payload)
              : createFromFetch<RscPayload>(fetch(action.url)),
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
   */
  function TransitionStatus(props: { isPending: boolean }) {
    React.useEffect(() => {
      let el = document.querySelector('#pending') as HTMLDivElement
      if (!el) {
        el = document.createElement('div')
        el.id = 'pending'
        el.textContent = 'pending...'
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

// Save reference to original pushState
const oldPushState = window.history.pushState

/**
 * Component that updates browser history via useInsertionEffect
 * This ensures history updates happen AFTER the state update but BEFORE paint
 * Inspired by Next.js App Router:
 * https://github.com/vercel/next.js/blob/main/packages/next/src/client/components/app-router.tsx
 */
function HistoryUpdater({ state }: { state: NavigationState }) {
  React.useInsertionEffect(() => {
    if (state.push) {
      state.push = false
      oldPushState.call(window.history, {}, '', state.url)
    }
  }, [state])

  return null
}

/**
 * Setup navigation interception
 */
function listenNavigation() {
  // Intercept pushState
  window.history.pushState = function (...args) {
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href, push: true })
    return
  }

  // Intercept replaceState
  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href })
    return
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
      history.pushState(null, '', link.href)
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
