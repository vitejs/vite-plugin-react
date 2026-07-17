import type React from 'react'
import { readFlightPreserved } from '../flight'
import { Root } from '../root'
import { createRscHandler } from './handler.rsc'

function RuntimeRoot(props: { url: URL }): React.ReactNode {
  return (
    <Root
      {...props}
      loadInlineContent={() =>
        // Written into dist/ by entry.prerender.rsc.tsx during the build.
        readFlightPreserved(
          new URL('../.flight-inline-prerender', import.meta.url),
        )
      }
    />
  )
}

export default { fetch: createRscHandler(RuntimeRoot) }
