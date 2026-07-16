import {
  createFromReadableStream,
  createFromFetch,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import type { RscPayload } from './entry.rsc'
import { GlobalErrorBoundary } from './error-boundary'
import { createRscRenderRequest } from './request'

async function main() {
  let setPayload: (value: RscPayload) => void

  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (value) => React.startTransition(() => setPayload_(value))
    }, [setPayload_])

    React.useEffect(() => {
      return listenNavigation(() => fetchRscPayload())
    }, [])

    return payload.root
  }

  async function fetchRscPayload() {
    const renderRequest = createRscRenderRequest(window.location.href)
    const payload = await createFromFetch<RscPayload>(fetch(renderRequest))
    setPayload(payload)
  }

  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet()
    const renderRequest = createRscRenderRequest(window.location.href, {
      id,
      body: await encodeReply(args, { temporaryReferences }),
    })
    const payload = await createFromFetch<RscPayload>(fetch(renderRequest), {
      temporaryReferences,
    })
    setPayload(payload)
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    return data
  })

  const browserRoot = (
    <React.StrictMode>
      <GlobalErrorBoundary>
        <BrowserRoot />
      </GlobalErrorBoundary>
    </React.StrictMode>
  )
  if ('__NO_HYDRATE' in globalThis) {
    createRoot(document).render(browserRoot)
  } else {
    hydrateRoot(document, browserRoot, {
      formState: initialPayload.formState,
    })
  }

  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      fetchRscPayload()
    })
  }
}

function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation)

  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    const result = oldPushState.apply(this, args)
    onNavigation()
    return result
  }

  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const result = oldReplaceState.apply(this, args)
    onNavigation()
    return result
  }

  function onClick(event: MouseEvent) {
    const link = (event.target as Element).closest('a')
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.defaultPrevented
    ) {
      event.preventDefault()
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
