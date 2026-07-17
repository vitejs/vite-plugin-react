import type React from 'react'
import { readFlightPreserved } from '../flight'
import { Root } from '../root'
import { createRscHandler } from './handler.rsc'

function RuntimeRoot(props: { url: URL }): React.ReactNode {
  return (
    <Root
      {...props}
      loadPage={(pathname) =>
        // Written into dist/flight/ by entry.prerender.rsc.tsx during the
        // build. Resolving by pathname keeps this bundle free of any
        // reference to the page modules.
        readFlightPreserved(
          new URL(`../flight${pathname}.flight`, import.meta.url),
        )
      }
    />
  )
}

export default { fetch: createRscHandler(RuntimeRoot) }
