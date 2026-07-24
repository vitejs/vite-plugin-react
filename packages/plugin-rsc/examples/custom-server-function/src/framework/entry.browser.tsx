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
import type { RscPayload } from './entry.rsc.tsx'
import { createRscRenderRequest } from './request.ts'

const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

function BrowserRoot() {
  const [payload, setPayload] = React.useState(initialPayload)
  React.useEffect(() => {
    setServerCallback(async (id, args) => {
      const temporaryReferences = createTemporaryReferenceSet()
      const request = createRscRenderRequest(window.location.href, {
        id,
        body: await encodeReply(args, { temporaryReferences }),
      })
      const nextPayload = await createFromFetch<RscPayload>(fetch(request), {
        temporaryReferences,
      })
      React.startTransition(() => setPayload(nextPayload))
      const { ok, data } = nextPayload.returnValue!
      if (!ok) throw data
      return data
    })
  }, [])
  return payload.root
}

hydrateRoot(document, <BrowserRoot />)
