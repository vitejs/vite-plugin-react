import {
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@hiogawa/vite-rsc/browser'
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import {
  unstable_RSCHydratedRouter as RSCHydratedRouter,
  type unstable_RSCPayload as RSCPayload,
  unstable_createCallServer as createCallServer,
  unstable_getRSCStream as getRSCStream,
} from 'react-router'

setServerCallback(
  createCallServer({
    createFromReadableStream,
    encodeReply,
    createTemporaryReferenceSet,
  }),
)

createFromReadableStream<RSCPayload>(getRSCStream()).then(
  (payload: RSCPayload) => {
    React.startTransition(() => {
      hydrateRoot(
        document,
        <React.StrictMode>
          <RSCHydratedRouter
            createFromReadableStream={createFromReadableStream}
            payload={payload}
          />
        </React.StrictMode>,
      )
    })
  },
)
