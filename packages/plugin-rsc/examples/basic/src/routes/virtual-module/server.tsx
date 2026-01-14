// @ts-expect-error virtual module
import { TestVirtualClient } from 'virtual:test-virtual-client'
import { TestClientWithVirtualCss } from './client'

// Server CSS is loaded via <link> tag in RSC
// Query-aware: works in dev (handles ?direct)
import 'virtual:test-style-server-query.css'
// Exact-match: fails in dev (Vite limitation), works in build
import 'virtual:test-style-server-exact.css'

export function TestVirtualModule() {
  return (
    <div data-testid="test-virtual-module">
      <div className="test-virtual-style-server-query">
        test-virtual-style-server-query
      </div>
      <div className="test-virtual-style-server-exact">
        test-virtual-style-server-exact
      </div>
      <TestClientWithVirtualCss />
      <TestVirtualClient />
    </div>
  )
}
