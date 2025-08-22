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

  function reducer(action: NavigationAction): NavigationState {
    if (action.payload) {
      return {
        url: action.url,
        payloadPromise: Promise.resolve(action.payload),
      }
    }
    return {
      url: action.url,
      push: action.push,
      payloadPromise: createFromFetch<RscPayload>(fetch(action.url)),
    }
  }

  // browser root component to (re-)render RSC payload as state
  function BrowserRoot() {
    const [state, setState_] = React.useState(initialNavigationState)

    // https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/use-action-queue.ts#L49
    dispatch = (action: NavigationAction) => {
      React.startTransition(() => setState_(reducer(action)))
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
    dispatch({ url: url.href, payload })
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
      dispatch({ url: window.location.href })
    })
  }
}

// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router-instance.ts
// https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/client/components/app-router.tsx
type NavigationState = {
  url: string
  push?: boolean
  payloadPromise: Promise<RscPayload>
}

type NavigationAction = {
  url: string
  push?: boolean
  payload?: RscPayload
}

// https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/app-router.tsx#L96
function HistoryUpdater({ state }: { state: NavigationState }) {
  React.useInsertionEffect(() => {
    if (state.push) {
      state.push = false
      oldPushState.call(window.history, {}, '', state.url)
    }
  }, [state])

  return null
}

const oldPushState = window.history.pushState

function listenNavigation() {
  window.history.pushState = function (...args) {
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href, push: true })
    return
  }

  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const url = new URL(args[2] || window.location.href, window.location.href)
    dispatch({ url: url.href })
    return
  }

  function onPopstate() {
    const href = window.location.href
    dispatch({ url: href })
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
      window.history.pushState(null, '', link.href)
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
