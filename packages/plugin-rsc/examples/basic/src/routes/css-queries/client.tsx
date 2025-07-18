'use client'

// Test CSS imports with special queries (?url, ?inline, ?raw) in client components
// These should not be collected for server-side rendering
import cssUrl from './client-url.css?url'
import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'
import './client.css' // Normal import should still work

export default function CssQueriesClientTest() {
  return (
    <div className="test-css-query-client-normal">
      <div data-testid="test-css-queries-client-url">
        CSS URL (client): {cssUrl}
      </div>
      <div
        data-testid="test-css-queries-client-inline"
        style={{ display: 'none' }}
      >
        CSS Inline (client):{' '}
        {typeof cssInline === 'string' ? 'string' : 'other'}
      </div>
      <div
        data-testid="test-css-queries-client-raw"
        style={{ display: 'none' }}
      >
        CSS Raw (client): {typeof cssRaw === 'string' ? 'string' : 'other'}
      </div>
      <div data-testid="test-css-queries-client-normal">
        Normal CSS import works (client)
      </div>
    </div>
  )
}
