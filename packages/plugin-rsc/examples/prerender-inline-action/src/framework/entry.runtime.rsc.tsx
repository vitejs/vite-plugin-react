import { readFile } from 'node:fs/promises'
import { createFromReadableStream } from '@vitejs/plugin-rsc/rsc'
import type React from 'react'
import { Root } from '../root'
import { createRscHandler } from './handler.rsc'

function RuntimeRoot(props: { url: URL }): React.ReactNode {
  return (
    <Root
      {...props}
      loadPage={async () => {
        const bytes = await readFile(
          new URL('../flight/page.flight', import.meta.url),
        )
        return createFromReadableStream<React.ReactNode>(
          new Blob([bytes]).stream(),
          {},
          { preserveServerReferences: true },
        )
      }}
    />
  )
}

export default { fetch: createRscHandler(RuntimeRoot) }
