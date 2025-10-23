import {
  createFromReadableStream,
  createFromFetch,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import type { RscPayload } from './entry.rsc'

async function main() {
  let setPayload: (v: RscPayload) => void

  // Deserialize initial RSC stream from the injected payload
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    // Re-fetch on navigation
    React.useEffect(() => {
      return listenNavigation(() => fetchRscPayload())
    }, [])

    return payload.root
  }

  async function fetchRscPayload() {
    const payload = await createFromFetch<RscPayload>(
      fetch(window.location.href),
    )
    setPayload(payload)
  }

  // Hydrate the application
  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  hydrateRoot(document, browserRoot)

  // Handle server HMR
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      fetchRscPayload()
    })
  }
}

// Navigation helper for client-side routing
function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation)

  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    const res = oldPushState.apply(this, args)
    onNavigation()
    return res
  }

  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const res = oldReplaceState.apply(this, args)
    onNavigation()
    return res
  }

  function onClick(e: MouseEvent) {
    let link = (e.target as Element).closest('a')
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
      history.pushState(null, '', link.href)
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onNavigation)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}

main()
