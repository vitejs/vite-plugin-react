import {
  createFromFetch,
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import type { RscPayload } from './entry.rsc'

async function main() {
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)
  let setPayload: (payload: RscPayload) => void

  function BrowserRoot() {
    const [payload, setPayloadState] = React.useState(initialPayload)
    React.useEffect(() => {
      setPayload = (next) => React.startTransition(() => setPayloadState(next))
    }, [])
    return payload.root
  }

  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet()
    const url = new URL(window.location.href)
    url.pathname += '_.rsc'
    const payload = await createFromFetch<RscPayload>(
      fetch(url, {
        method: 'POST',
        headers: { 'x-rsc-action': id },
        body: await encodeReply(args, { temporaryReferences }),
      }),
      { temporaryReferences },
    )
    setPayload(payload)
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    return data
  })

  hydrateRoot(document, <BrowserRoot />)
}

main()
