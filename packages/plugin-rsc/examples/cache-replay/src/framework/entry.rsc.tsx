import type React from 'react'
import { Root } from '../root'
import { createRscHandler, type RscPayload } from './handler.rsc'

export type { RscPayload }

function AppRoot(props: { url: URL }): React.ReactNode {
  return (
    <Root
      {...props}
      loadInlineContent={async () => {
        const { CachedInlineContent } = await import('../cached-inline-content')
        return <CachedInlineContent />
      }}
    />
  )
}

export default { fetch: createRscHandler(AppRoot) }

if (import.meta.hot) {
  import.meta.hot.accept()
}
