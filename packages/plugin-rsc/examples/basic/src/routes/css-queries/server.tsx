// Test CSS imports with special queries (?url, ?inline, ?raw) in server component
// These should not be collected for server-side rendering
import cssUrl from './server-url.css?url'
import cssInline from './server-inline.css?inline'
import cssRaw from './server-raw.css?raw'
import './server.css' // Normal import should still work
import CssQueriesClientTest from './client'

export default function CssQueriesTest() {
  return (
    <div>
      {/* Server component test */}
      <div className="test-css-query-server-normal">
        <div data-testid="test-css-queries-server-url">
          CSS URL (server): {cssUrl}
        </div>
        <div
          data-testid="test-css-queries-server-inline"
          style={{ display: 'none' }}
        >
          CSS Inline (server):{' '}
          {typeof cssInline === 'string' ? 'string' : 'other'}
        </div>
        <div
          data-testid="test-css-queries-server-raw"
          style={{ display: 'none' }}
        >
          CSS Raw (server): {typeof cssRaw === 'string' ? 'string' : 'other'}
        </div>
        <div data-testid="test-css-queries-server-normal">
          Normal CSS import works (server)
        </div>
      </div>

      {/* Client component test */}
      <CssQueriesClientTest />
    </div>
  )
}
