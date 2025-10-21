import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  createFromFetch,
  setServerCallback,
  setRequireModule,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/react/browser'
import type { RscPayload } from './entry.rsc'
import buildClientReferences from 'virtual:vite-rsc-browser-mode2/build-client-references'

let fetchRsc: (request: Request) => Promise<Response>

export function initialize(options: {
  fetchRsc: (request: Request) => Promise<Response>
}) {
  fetchRsc = options.fetchRsc

  // Setup client reference loading
  setRequireModule({
    load: async (id) => {
      if (import.meta.env.__vite_rsc_build__) {
        const import_ = buildClientReferences[id]
        if (!import_) {
          throw new Error(`invalid client reference: ${id}`)
        }
        return import_()
      } else {
        return import(/* @vite-ignore */ id)
      }
    },
  })
}

export async function main() {
  // stash `setPayload` function to trigger re-rendering
  // from outside of `BrowserRoot` component (e.g. server function call, navigation, hmr)
  let setPayload: (v: RscPayload) => void

  const initialPayload = await createFromFetch<RscPayload>(
    fetchRsc(new Request(window.location.href)),
  )

  // browser root component to (re-)render RSC payload as state
  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    // re-fetch/render on client side navigation
    React.useEffect(() => {
      return listenNavigation(() => fetchRscPayload())
    }, [])

    return payload.root
  }

  // re-fetch RSC and trigger re-rendering
  async function fetchRscPayload() {
    const payload = await createFromFetch<RscPayload>(
      fetchRsc(new Request(window.location.href)),
    )
    setPayload(payload)
  }

  // register a handler which will be internally called by React
  // on server function request after hydration.
  setServerCallback(async (id, args) => {
    const url = new URL(window.location.href)
    const temporaryReferences = createTemporaryReferenceSet()
    const payload = await createFromFetch<RscPayload>(
      fetchRsc(
        new Request(url, {
          method: 'POST',
          body: await encodeReply(args, { temporaryReferences }),
          headers: {
            'x-rsc-action': id,
          },
        }),
      ),
      { temporaryReferences },
    )
    setPayload(payload)
    return payload.returnValue
  })

  // hydration
  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  createRoot(document.body).render(browserRoot)

  // implement server HMR by trigering re-fetch/render of RSC upon server code change
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      fetchRscPayload()
    })
  }
}

// a little helper to setup events interception for client side navigation
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
