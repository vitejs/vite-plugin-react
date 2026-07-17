import type React from 'react'
import { inlinePages } from '../inline-pages'
import { Root } from '../root'
import { createRscHandler, type RscPayload } from './handler.rsc'

export type { RscPayload }

function AppRoot(props: { url: URL }): React.ReactNode {
  return <Root {...props} loadPage={(pathname) => inlinePages[pathname]!()} />
}

export default { fetch: createRscHandler(AppRoot) }

if (import.meta.hot) {
  import.meta.hot.accept()
}
