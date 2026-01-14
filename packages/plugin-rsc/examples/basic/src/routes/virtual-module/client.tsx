'use client'

// Exact-match virtual CSS: works via JS import (no ?direct issue)
// Would fail if loaded via <link> tag in dev mode
import 'virtual:test-style-exact.css'

export function TestClientWithVirtualCss() {
  return (
    <div className="test-virtual-style-exact">test-virtual-style-exact</div>
  )
}
