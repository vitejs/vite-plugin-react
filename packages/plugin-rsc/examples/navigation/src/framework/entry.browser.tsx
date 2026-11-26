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
// import { NavigationManager, type NavigationState } from './navigation'
import { GlobalErrorBoundary } from './error-boundary'
import { createRscRenderRequest } from './request'
// import { RouterContext, type RouterContextType } from './router'
// import { createBrowserHistory } from "@tanstack/history"

type NavigationEntry = {
  url: string
  // cached page payload
  // TODO: reuse for back/forward navigation. invalidate on server function.
  data: Promise<RscPayload>
  // update browser url on commit
  flush: () => void
}

// https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/app-router.tsx#L96
// https://github.com/rickhanlonii/async-react/blob/c971b2fa57785dc2014251ec90d3c18cb7a958c6/src/router/index.jsx#L114-L116
function FlushNavigationEntry({ entry }: { entry: NavigationEntry }) {
  React.useInsertionEffect(() => {
    // ensure it flushed once for any entry (e.g. strict mode)
    entry.flush()
    entry.flush = () => {}
  }, [entry])

  return null
}

function RenderNavigationEntry({ entry }: { entry: NavigationEntry }) {
  return React.use(entry.data).root
}

// class NavigationEntryManager {
//   // TODO
//   // entries for navigation stack
//   // TODO
//   // dispatch(url: string) {}
// }

async function main() {
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  // const browserHistory = createBrowserHistory();
  // browserHistory.go;
  // browserHistory.subscribe
  // const manager = new NavigationManager(initialPayload)

  // function Router(props: React.PropsWithChildren) {
  //   const routerContext: RouterContextType = {
  //     url: window.location.href,
  //     navigate: (to: string, options?: { replace?: boolean }) => {
  //     },
  //   }
  //   const routeState = {
  //     url: window.location.href,
  //     commit: () => {},
  //   };
  //   // React.useOptimistic;
  //   // optimisticUrl

  //   return (
  //     <RouterContext.Provider value={routerContext}>
  //       {props.children}
  //     </RouterContext.Provider>
  //   )
  // }

  const initialEntry: NavigationEntry = {
    url: window.location.href,
    data: Promise.resolve(initialPayload),
    flush: () => {},
  }

  let setCurrentEntry: React.Dispatch<React.SetStateAction<NavigationEntry>>

  function navigate(url: string, options?: { replace?: boolean }) {
    setCurrentEntry({
      url,
      data: createFromFetch<RscPayload>(fetch(createRscRenderRequest(url))),
      flush: () => {
        if (options?.replace) {
          window.history.replaceState({}, '', url)
        } else {
          window.history.pushState({}, '', url)
        }
      },
    })
  }

  function BrowserRoot() {
    const [currentEntry, setCurrentEntry_] =
      React.useState<NavigationEntry>(initialEntry)
    // const [isPending, setIsPending] = React.useOptimistic(false);
    const [isPending, startTransition] = React.useTransition()

    // const [state, setState] = React.useState(manager.getState())
    // const [isPending, startTransition] = React.useTransition()

    // https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/use-action-queue.ts#L49
    // React.useEffect(() => {
    //   manager.setReactHandlers(setState, startTransition)
    //   return manager.listen()
    // }, [])

    React.useEffect(() => {
      setCurrentEntry = setCurrentEntry_

      const handleAnchorClick = (e: MouseEvent) => {
        const link = (e.target as Element).closest('a')
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
          startTransition(() => {
            navigate(link.href)
          })
        }
      }

      document.addEventListener('click', handleAnchorClick)

      // Handle popstate (back/forward)
      function handlePopstate(e: PopStateEvent) {
        // TODO: use state key from event to look up cache
        // e.state.key
        e
        // this.navigate(window.location.href)
      }

      window.addEventListener('popstate', handlePopstate)

      // Cleanup
      return () => {
        document.removeEventListener('click', handleAnchorClick)
        window.removeEventListener('popstate', handlePopstate)
      }
    }, [])

    return (
      <>
        <TransitionStatus isPending={isPending} />
        <FlushNavigationEntry entry={currentEntry} />
        <RenderNavigationEntry entry={currentEntry} />
      </>
    )
  }

  // function BrowserRoot() {
  //   const [state, setState] = React.useState(manager.getState())
  //   const [isPending, startTransition] = React.useTransition()

  //   // https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/use-action-queue.ts#L49
  //   // React.useEffect(() => {
  //   //   manager.setReactHandlers(setState, startTransition)
  //   //   return manager.listen()
  //   // }, [])

  //   React.useEffect(() => {
  //     browserHistory.subscribe;
  //   }, [])

  //   return (
  //     <>
  //       {state.push && <HistoryUpdater url={state.url} />}
  //       {/* <TransitionStatus isPending={isPending} /> */}
  //       <RenderState state={state} />
  //     </>
  //   )
  // }

  // https://github.com/vercel/next.js/blob/08bf0e08f74304afb3a9f79e521e5148b77bf96e/packages/next/src/client/components/app-router.tsx#L96
  // function HistoryUpdater({ url }: { url: string }) {
  //   React.useInsertionEffect(() => {
  //     manager.commitHistoryPush(url)
  //   }, [url])
  //   return null
  // }

  // TODO: expose `isPending` via store / context
  function TransitionStatus(props: { isPending: boolean }) {
    React.useEffect(() => {
      let el = document.querySelector('#pending') as HTMLDivElement
      if (!el) {
        el = document.createElement('div')
        el.id = 'pending'
        el.style.position = 'fixed'
        el.style.top = '10px'
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

  // function RenderState({ state }: { state: NavigationState }) {
  //   const payload = React.use(state.payloadPromise)
  //   return payload.root
  // }

  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet()
    const renderRequest = createRscRenderRequest(window.location.href, {
      id,
      body: await encodeReply(args, { temporaryReferences }),
    })
    const payload = await createFromFetch<RscPayload>(fetch(renderRequest), {
      temporaryReferences,
    })
    // manager.handleServerAction(payload)
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    setCurrentEntry({
      url: window.location.href,
      data: Promise.resolve(payload),
      flush: () => {},
    })
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
      // manager.invalidateCache()
      // manager.navigate(window.location.href)
      navigate(window.location.href, { replace: true })
    })
  }
}

main()
