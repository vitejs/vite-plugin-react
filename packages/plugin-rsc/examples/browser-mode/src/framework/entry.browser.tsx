import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactClient from '@vitejs/plugin-rsc/react/browser'
import type { RscPayload } from './entry.rsc'

let fetchServer: typeof import('./entry.rsc').fetchServer

export function initialize(options: { fetchServer: typeof fetchServer }) {
  fetchServer = options.fetchServer
  ReactClient.setRequireModule({
    load: (id) => import(/* @vite-ignore */ id),
  })
}

export async function main() {
  let setPayload: (v: RscPayload) => void

  const initialPayload = await ReactClient.createFromFetch<RscPayload>(
    fetchServer(new Request(window.location.href)),
  )

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    return payload.root
  }

  ReactClient.setServerCallback(async (id, args) => {
    const url = new URL(window.location.href)
    const temporaryReferences = ReactClient.createTemporaryReferenceSet()
    const payload = await ReactClient.createFromFetch<RscPayload>(
      fetchServer(
        new Request(url, {
          method: 'POST',
          body: await ReactClient.encodeReply(args, { temporaryReferences }),
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

  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  ReactDOMClient.createRoot(document.body).render(browserRoot)
}
