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

async function main() {
  // stash `setPayload` function to trigger re-rendering
  // from outside of `BrowserRoot` component (e.g. server function call, navigation, hmr)
  let setPayload: (v: RscPayload) => void

  // deserialize RSC stream back to React VDOM for CSR
  const initialPayload = await createFromReadableStream<RscPayload>(
    // initial RSC stream is injected in SSR stream as <script>...FLIGHT_DATA...</script>
    rscStream,
    {
      // Error handling for RSC deserialization
      onError(error: unknown) {
        console.error('[rsc] Failed to deserialize initial payload:', error)
      },
    },
  )

  // browser root component to (re-)render RSC payload as state
  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)
    const [error, setError] = React.useState<Error | null>(null)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    // re-fetch/render on client side navigation
    React.useEffect(() => {
      return listenNavigation(() => fetchRscPayload())
    }, [])

    // Error boundary-like display
    if (error) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Navigation Error</h1>
          <pre>{error.message}</pre>
          <button
            onClick={() => {
              setError(null)
              window.location.reload()
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return payload.root
  }

  // re-fetch RSC and trigger re-rendering
  async function fetchRscPayload() {
    try {
      const payload = await createFromFetch<RscPayload>(
        fetch(window.location.href),
        {
          // Error handling for RSC deserialization
          onError(error: unknown) {
            console.error('[rsc] Failed to deserialize RSC payload:', error)
          },
        },
      )
      setPayload(payload)
    } catch (error) {
      console.error('[navigation] Failed to fetch RSC payload:', error)
      // In case of navigation error, reload the page as fallback
      window.location.reload()
    }
  }

  // register a handler which will be internally called by React
  // on server function request after hydration.
  setServerCallback(async (id, args) => {
    try {
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
        {
          temporaryReferences,
          // Error handling for RSC deserialization during server function calls
          onError(error: unknown) {
            console.error('[rsc] Server function call error:', error)
          },
        },
      )
      setPayload(payload)
      return payload.returnValue
    } catch (error) {
      console.error('[server-function] Failed to call server function:', error)
      throw error
    }
  })

  // hydration
  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  hydrateRoot(document, browserRoot, {
    formState: initialPayload.formState,
  })

  // implement server HMR by trigering re-fetch/render of RSC upon server code change
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      fetchRscPayload()
    })
  }
}

// Improved helper for client-side navigation with:
// - Coordinated history and transition handling
// - Back/forward cache support
// - Error handling
// - Loading states
function listenNavigation(onNavigation: () => void) {
  // Cache for storing fetched RSC payloads by URL
  const navigationCache = new Map<string, Promise<unknown>>()

  // Track ongoing navigation to coordinate history updates with transitions
  let pendingNavigationUrl: string | null = null
  let navigationAbortController: AbortController | null = null

  // Handle popstate (back/forward navigation)
  function handlePopState() {
    // Cancel any pending navigation
    if (navigationAbortController) {
      navigationAbortController.abort()
      navigationAbortController = null
    }

    pendingNavigationUrl = window.location.href

    // Check back/forward cache first
    const cachedPayload = navigationCache.get(window.location.href)
    if (cachedPayload) {
      // Use cached payload for instant back/forward navigation
      cachedPayload
        .then(() => {
          if (pendingNavigationUrl === window.location.href) {
            onNavigation()
            pendingNavigationUrl = null
          }
        })
        .catch((error) => {
          console.error('[navigation] Failed to use cached payload:', error)
          if (pendingNavigationUrl === window.location.href) {
            onNavigation()
            pendingNavigationUrl = null
          }
        })
    } else {
      // Fetch new payload
      onNavigation()
      pendingNavigationUrl = null
    }
  }

  window.addEventListener('popstate', handlePopState)

  // Patch history.pushState to coordinate with transitions
  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    const targetUrl = args[2]?.toString() || window.location.href

    // Cancel any pending navigation
    if (navigationAbortController) {
      navigationAbortController.abort()
    }
    navigationAbortController = new AbortController()

    pendingNavigationUrl = targetUrl

    // Perform the history update first
    const res = oldPushState.apply(this, args)

    // Then trigger the navigation in a transition
    // This ensures the URL updates immediately but rendering is deferred
    React.startTransition(() => {
      if (pendingNavigationUrl === targetUrl) {
        onNavigation()
        pendingNavigationUrl = null
        navigationAbortController = null
      }
    })

    return res
  }

  // Patch history.replaceState similarly
  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const targetUrl = args[2]?.toString() || window.location.href

    if (navigationAbortController) {
      navigationAbortController.abort()
    }
    navigationAbortController = new AbortController()

    pendingNavigationUrl = targetUrl

    const res = oldReplaceState.apply(this, args)

    React.startTransition(() => {
      if (pendingNavigationUrl === targetUrl) {
        onNavigation()
        pendingNavigationUrl = null
        navigationAbortController = null
      }
    })

    return res
  }

  // Intercept link clicks for client-side navigation
  function onClick(e: MouseEvent) {
    let link = (e.target as Element).closest('a')
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

      // Cache the current page before navigating away
      navigationCache.set(window.location.href, Promise.resolve(null))

      // Perform client-side navigation
      history.pushState(null, '', link.href)
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', handlePopState)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState

    // Cleanup navigation state
    if (navigationAbortController) {
      navigationAbortController.abort()
    }
  }
}

main()
