import {
  createFromFetch,
  createFromReadableStream,
} from '@vitejs/plugin-rsc/browser'
import React, { type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import { createRscRenderRequest } from './request.ts'

async function main() {
  const initialPayload = await createFromReadableStream<ReactNode>(rscStream)
  let setPayload: (payload: Awaited<ReactNode>) => void

  function BrowserRoot() {
    const [payload, setPayload_] =
      React.useState<Awaited<ReactNode>>(initialPayload)

    React.useEffect(() => {
      setPayload = (nextPayload) => {
        React.startTransition(() => setPayload_(nextPayload))
      }
    }, [])

    React.useEffect(() => listenNavigation(fetchRscPayload), [])
    return payload
  }

  async function fetchRscPayload() {
    const request = createRscRenderRequest(window.location.href)
    setPayload(await createFromFetch<ReactNode>(fetch(request)))
  }

  hydrateRoot(document, <BrowserRoot />)

  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', fetchRscPayload)
  }
}

function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation)

  function onClick(event: MouseEvent) {
    const link = (event.target as Element).closest('a')
    if (
      link instanceof HTMLAnchorElement &&
      link.origin === location.origin &&
      (!link.target || link.target === '_self') &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.defaultPrevented
    ) {
      event.preventDefault()
      history.pushState(null, '', link.href)
      onNavigation()
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onNavigation)
  }
}

main()
