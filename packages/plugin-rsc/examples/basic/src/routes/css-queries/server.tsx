import './test.css' // Normal CSS import - should be collected for SSR
import cssUrl from './test.css?url' // URL query - should NOT be collected
import cssInline from './test.css?inline' // Inline query - should NOT be collected
import cssRaw from './test.css?raw' // Raw query - should NOT be collected

export function TestCssQueriesServer() {
  return (
    <div data-testid="css-queries-server-component">
      <div className="test-css-query-normal" data-testid="css-normal-server">
        Normal CSS import in server component (should have styles in SSR)
      </div>
      <div data-testid="css-url-value-server">
        CSS URL value (server): {cssUrl}
      </div>
      <div data-testid="css-inline-content-server">
        CSS inline content length (server): {cssInline.length}
      </div>
      <div data-testid="css-raw-content-server">
        CSS raw content length (server): {cssRaw.length}
      </div>
    </div>
  )
}
