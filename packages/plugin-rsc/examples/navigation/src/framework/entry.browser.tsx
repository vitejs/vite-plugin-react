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
import { Router, type NavigationState } from './router'

/**
 * This example demonstrates coordinating history navigation with React transitions
 * and caching RSC payloads by history entry.
 *
 * Key features:
 * 1. Back/forward navigation is instant via cache (no loading state)
 * 2. Cache is keyed by history state, not URL
 * 3. Server actions invalidate cache for current entry
 * 4. All navigation logic consolidated in Router class
 *
 * Pattern inspired by:
 * https://github.com/hi-ogawa/vite-environment-examples/blob/main/examples/react-server
 */

async function main() {
  // Deserialize initial RSC stream from SSR
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  // Create router instance
  const router = new Router(initialPayload)

  // Browser root component
  function BrowserRoot() {
    const [state, setState] = React.useState(router.getState())
    const [isPending, startTransition] = React.useTransition()

    // Connect router to React state
    React.useEffect(() => {
      router.setReactHandlers(setState, startTransition)
      return router.listen()
    }, [])

    return (
      <>
        {state.push && <HistoryUpdater url={state.url} />}
        <TransitionStatus isPending={isPending} />
        <RenderState state={state} />
      </>
    )
  }

  /**
   * Updates history via useInsertionEffect
   */
  function HistoryUpdater({ url }: { url: string }) {
    React.useInsertionEffect(() => {
      router.commitHistoryPush(url)
    }, [url])
    return null
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
        el.textContent = 'loading...'
        el.style.opacity = '1'
      } else {
        el.style.opacity = '0'
      }
    }, [props.isPending])
    return null
  }

  /**
   * Renders the current navigation state
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
    router.handleServerAction(payload)
    return payload.returnValue
  })

  // Hydrate root
  hydrateRoot(
    document,
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>,
    { formState: initialPayload.formState },
  )

  // HMR support
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      router.invalidateCache()
      router.navigate(window.location.href)
    })
  }
}

main()
