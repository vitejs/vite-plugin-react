import {
  createFromFetch,
  createFromReadableStream,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import { createRscRenderRequest } from './request'
import type { RscPayload } from './shared'

async function hydrate(): Promise<void> {
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)
  let setPayload: (payload: RscPayload) => void

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)
    React.useEffect(() => {
      setPayload = (nextPayload) =>
        React.startTransition(() => setPayload_(nextPayload))
    }, [])
    React.useEffect(() => listenNavigation(navigate), [])
    return payload.root
  }

  async function navigate() {
    const request = createRscRenderRequest(window.location.href)
    setPayload(await createFromFetch<RscPayload>(fetch(request)))
  }

  hydrateRoot(document, <BrowserRoot />)
}

function listenNavigation(onNavigation: () => void): () => void {
  const onPopState = () => onNavigation()
  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element).closest('a')
    if (
      link instanceof HTMLAnchorElement &&
      link.origin === location.origin &&
      !link.target &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault()
      history.pushState(null, '', link.href)
      onNavigation()
    }
  }
  window.addEventListener('popstate', onPopState)
  document.addEventListener('click', onClick)
  return () => {
    window.removeEventListener('popstate', onPopState)
    document.removeEventListener('click', onClick)
  }
}

hydrate()
