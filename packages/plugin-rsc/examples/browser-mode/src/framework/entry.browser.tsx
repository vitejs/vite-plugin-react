import * as React from 'react'
import { createRoot } from 'react-dom/client'
import {
  createFromFetch,
  setRequireModule,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/react/browser'
import type { RscPayload } from './entry.rsc'
import buildClientReferences from 'virtual:vite-rsc-browser-mode/build-client-references'

let fetchServer: typeof import('./entry.rsc').fetchServer

export function initialize(options: { fetchServer: typeof fetchServer }) {
  fetchServer = options.fetchServer
  setRequireModule({
    load: (id) => {
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
  let setPayload: (v: RscPayload) => void

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
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    return data
  })

  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  )
  createRoot(document.body).render(browserRoot)
}
