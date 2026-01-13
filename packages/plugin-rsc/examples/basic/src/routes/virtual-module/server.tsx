// @ts-expect-error virtual module
import { TestVirtualClient } from 'virtual:test-virtual-client'
import { TestClientWithVirtualCss } from './client'
import 'virtual:test-style-server.css'

export function TestVirtualModule() {
  return (
    <div data-testid="test-virtual-module">
      <div className="test-virtual-style-server">test-virtual-style-server</div>
      <TestClientWithVirtualCss />
      <TestVirtualClient />
    </div>
  )
}
