'use client'

// Direct case: lazy client component with CSS (one step)
import './client-direct.css'

export function TestLazyClientCssDirect() {
  return (
    <span className="test-lazy-client-css-direct">lazy-client-css-direct</span>
  )
}
