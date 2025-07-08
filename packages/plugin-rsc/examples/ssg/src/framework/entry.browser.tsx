import * as ReactClient from '@vitejs/plugin-rsc/browser'
import { getRscStreamFromHtml } from '@vitejs/plugin-rsc/rsc-html-stream/browser'
import React from 'react'
import ReactDomClient from 'react-dom/client'
import { RSC_POSTFIX, type RscPayload } from './shared'

async function hydrate(): Promise<void> {
  async function onNavigation() {
    const url = new URL(window.location.href)
    url.pathname = url.pathname + RSC_POSTFIX
    const payload = await ReactClient.createFromFetch<RscPayload>(fetch(url))
    setPayload(payload)
  }

  const initialPayload = await ReactClient.createFromReadableStream<RscPayload>(
    getRscStreamFromHtml(),
  )

  let setPayload: (v: RscPayload) => void

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    React.useEffect(() => {
      return listenNavigation(() => onNavigation())
    }, [])

    return payload.root
  }

  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )

  ReactDomClient.hydrateRoot(document, browserRoot)

  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      window.history.replaceState({}, '', window.location.href)
    })
  }
}

function listenNavigation(onNavigation: () => void): () => void {
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

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onNavigation)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}

hydrate()
