import {
  createFromFetch,
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { startTransition, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import { createActionRequest } from './request.js'

const initialPayload = await createFromReadableStream(rscStream)
let updatePayload

function BrowserRoot() {
  const [payload, setPayload] = useState(initialPayload)
  updatePayload = (nextPayload) =>
    startTransition(() => setPayload(nextPayload))
  return payload.root
}

setServerCallback(async (id, args) => {
  const temporaryReferences = createTemporaryReferenceSet()
  const request = createActionRequest(
    window.location.href,
    id,
    await encodeReply(args, { temporaryReferences }),
  )
  const payload = await createFromFetch(fetch(request), { temporaryReferences })
  updatePayload(payload)
  return payload.returnValue
})

hydrateRoot(document, <BrowserRoot />)
