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

let dispatch: (action: NavigationAction) => void

async function main() {
  // stash `setPayload` function to trigger re-rendering
  // from outside of `BrowserRoot` component (e.g. server function call, navigation, hmr)
  // let setPayload: (v: RscPayload) => void

  // deserialize RSC stream back to React VDOM for CSR
  const initialPayload = await createFromReadableStream<RscPayload>(
    // initial RSC stream is injected in SSR stream as <script>...FLIGHT_DATA...</script>
    rscStream,
  )

  const initialNavigationState: NavigationState = {
    payloadPromise: Promise.resolve(initialPayload),
    url: window.location.href,
    push: false,
  }

  function reducer(
    state: NavigationState,
    action: NavigationAction,
  ): NavigationState {
    if (action.type === 'push' || action.type === 'replace') {
      return {
        ...state,
        url: action.url,
        push: action.type === 'push',
        payloadPromise: createFromFetch<RscPayload>(fetch(action.url)),
      }
    }
    if (action.type === 'setPayload') {
      return {
        ...state,
        push: false,
        payloadPromise: Promise.resolve(action.payload),
      }
    }
    console.error(action)
    throw new Error(`Unknown action type: ${action.type}`)
  }

  // browser root component to (re-)render RSC payload as state
  function BrowserRoot() {
    const [state, setState_] = React.useState(initialNavigationState)
    dispatch = (v: NavigationAction) => {
      React.startTransition(() => setState_(reducer(state, v)))
    }

    React.useEffect(() => {
      return listenNavigation()
    }, [])

    return (
      <>
        <HistoryUpdater state={state} />
        <RenderState state={state} />
      </>
    )
  }

  function RenderState({ state }: { state: NavigationState }) {
    const payload = React.use(state.payloadPromise)
    return payload.root
  }

  // re-fetch RSC and trigger re-rendering
  // async function fetchRscPayload() {
  //   const payload = await createFromFetch<RscPayload>(
  //     fetch(window.location.href),
  //   )
  //   setPayload(payload)
  // }

  // register a handler which will be internally called by React
  // on server function request after hydration.
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
    dispatch({ type: 'setPayload', payload })
    return payload.returnValue
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
      dispatch({ type: 'replace', url: window.location.href })
    })
  }
}

// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router-instance.ts
// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router.tsx
type NavigationState = {
  url: string
  push: boolean
  payloadPromise: Promise<RscPayload>
}

type NavigationAction =
  | {
      type: 'push' | 'replace'
      url: string
    }
  | {
      type: 'setPayload'
      payload: RscPayload
    }

const PUSH_HISTORY = 'PUSH_HISTORY'

function HistoryUpdater({ state }: { state: NavigationState }) {
  React.useInsertionEffect(() => {
    if (state.push) {
      state.push = false
      window.history.pushState({ [PUSH_HISTORY]: true }, '', state.url)
    }
  }, [state])

  return null
}

function listenNavigation() {
  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    if (args[0] && typeof args[0] === 'object' && PUSH_HISTORY in args[0]) {
      oldPushState.apply(this, args)
      return
    }
    const href = window.location.href
    const url = new URL(args[2] || href, href)
    dispatch({ type: 'push', url: url.href })
    return
  }

  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const href = window.location.href
    const url = new URL(args[2] || href, href)
    dispatch({ type: 'replace', url: url.href })
    return
  }

  function onPopstate() {
    const href = window.location.href
    dispatch({ type: 'replace', url: href })
  }
  window.addEventListener('popstate', onPopstate)

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
      dispatch({ type: 'push', url: link.href })
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPopstate)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}

main()
