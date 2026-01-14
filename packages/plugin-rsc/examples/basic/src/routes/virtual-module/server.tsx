// @ts-expect-error virtual module
import { TestVirtualClient } from 'virtual:test-virtual-client'
import { TestClientWithVirtualCss } from './client'
// Query-aware virtual CSS: works with <link> in dev mode
// See vite.config.ts for the query-stripping pattern
import 'virtual:test-style-query-aware.css'

export function TestVirtualModule() {
  return (
    <div data-testid="test-virtual-module">
      <div className="test-virtual-style-query-aware">
        test-virtual-style-query-aware
      </div>
      <TestClientWithVirtualCss />
      <TestVirtualClient />
    </div>
  )
}
