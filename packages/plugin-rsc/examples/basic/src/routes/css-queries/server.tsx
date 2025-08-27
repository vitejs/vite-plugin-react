import cssUrl from './server-url.css?url'
import cssInline from './server-inline.css?inline'
import cssRaw from './server-raw.css?raw'
import { TestCssQueriesClient } from './client'

export function TestCssQueries() {
  return (
    <div>
      <TestCssQueriesClient
        serverUrl={cssUrl}
        serverInline={cssInline}
        serverRaw={cssRaw}
      />
      <span className="test-css-url-server">test-css-url-server</span>
      <span>|</span>
      <span className="test-css-inline-server">test-css-inline-server</span>
      <span>|</span>
      <span className="test-css-raw-server">test-css-raw-server</span>
    </div>
  )
}
