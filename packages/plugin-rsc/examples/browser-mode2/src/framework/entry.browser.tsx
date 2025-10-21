import * as React from 'react'
import { createRoot } from 'react-dom/client'
import {
  createFromFetch,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser'
import type { RscPayload } from './entry.rsc'

let fetchServer: typeof import('./entry.rsc').fetchServer

export function initialize(options: { fetchServer: typeof fetchServer }) {
  fetchServer = options.fetchServer
}

export async function main() {
  let setPayload: (v: RscPayload) => void

  // Set server callback BEFORE processing the initial payload
  setServerCallback(async (id, args) => {
    const url = new URL(window.location.href)
    const temporaryReferences = createTemporaryReferenceSet()
    const payload = await createFromFetch<RscPayload>(
      fetchServer(
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

  const initialPayload = await createFromFetch<RscPayload>(
    fetchServer(new Request(window.location.href)),
  )

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])

    return payload.root
  }

  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  createRoot(document.body).render(browserRoot)
}
