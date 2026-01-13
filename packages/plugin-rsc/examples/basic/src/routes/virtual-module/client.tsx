'use client'

import React from 'react'
import 'virtual:test-style-client.css'

export function TestClientWithVirtualCss() {
  const [clicked, setClicked] = React.useState(false)
  return (
    <div>
      <button
        type="button"
        data-testid="test-client-with-virtual-css"
        onClick={() => setClicked(true)}
      >
        test-client-with-virtual-css: {clicked ? 'clicked' : 'not-clicked'}
      </button>
      <div className="test-virtual-style-client">test-virtual-style-client</div>
    </div>
  )
}
