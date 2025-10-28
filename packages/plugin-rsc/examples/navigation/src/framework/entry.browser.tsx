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
import { NavigationManager, type NavigationState } from './navigation'

async function main() {
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  const router = new NavigationManager(initialPayload)

  function BrowserRoot() {
    const [state, setState] = React.useState(router.getState())
    const [isPending, startTransition] = React.useTransition()

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

  function HistoryUpdater({ url }: { url: string }) {
    React.useInsertionEffect(() => {
      router.commitHistoryPush(url)
    }, [url])
    return null
  }

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

  function RenderState({ state }: { state: NavigationState }) {
    const payload = React.use(state.payloadPromise)
    return payload.root
  }

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

  hydrateRoot(
    document,
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>,
    { formState: initialPayload.formState },
  )

  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => {
      router.invalidateCache()
      router.navigate(window.location.href)
    })
  }
}

main()
