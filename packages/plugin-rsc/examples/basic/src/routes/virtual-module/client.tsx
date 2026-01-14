'use client'

// Client CSS is loaded via JS import (HMR injects styles)
// Both patterns work because no ?direct is involved
import 'virtual:test-style-client-query.css'
import 'virtual:test-style-client-exact.css'

export function TestClientWithVirtualCss() {
  return (
    <>
      <div className="test-virtual-style-client-query">
        test-virtual-style-client-query
      </div>
      <div className="test-virtual-style-client-exact">
        test-virtual-style-client-exact
      </div>
    </>
  )
}
