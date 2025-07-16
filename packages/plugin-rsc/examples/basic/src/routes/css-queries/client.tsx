'use client'

import './test.css' // Normal CSS import - should be collected for SSR
import cssUrl from './test.css?url' // URL query - should NOT be collected
import cssInline from './test.css?inline' // Inline query - should NOT be collected
import cssRaw from './test.css?raw' // Raw query - should NOT be collected

export function TestCssQueries() {
  return (
    <div data-testid="css-queries-component">
      <div className="test-css-query-normal" data-testid="css-normal">
        Normal CSS import (should have styles in SSR)
      </div>
      <div data-testid="css-url-value">CSS URL value: {cssUrl}</div>
      <div data-testid="css-inline-content">
        CSS inline content length: {cssInline.length}
      </div>
      <div data-testid="css-raw-content">
        CSS raw content length: {cssRaw.length}
      </div>
    </div>
  )
}
