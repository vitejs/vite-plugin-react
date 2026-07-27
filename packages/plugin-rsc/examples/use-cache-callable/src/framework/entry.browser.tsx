import {
  createFromFetch,
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { useEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import type { RscPayload } from './entry.rsc'
import { createRscRenderRequest } from './request'

async function main() {
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)
  let updatePayload: (payload: RscPayload) => void

  function BrowserRoot() {
    const [payload, setPayload] = useState(initialPayload)
    useEffect(() => {
      updatePayload = setPayload
    }, [])
    return payload.root
  }

  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet()
    const request = createRscRenderRequest(window.location.href, {
      id,
      body: await encodeReply(args, { temporaryReferences }),
    })
    const payload = await createFromFetch<RscPayload>(fetch(request), {
      temporaryReferences,
    })
    updatePayload(payload)
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    return data
  })

  hydrateRoot(document, <BrowserRoot />)
}

main()
