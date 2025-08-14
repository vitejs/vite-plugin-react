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
      <div>
        <div className="test-css-url-server">test-css-url-server: {cssUrl}</div>
        <div className="test-css-inline-server">
          test-css-inline-server:{' '}
          {typeof cssInline === 'string' ? 'string' : 'other'}
        </div>
        <div className="test-css-raw-server">
          test-css-raw-server: {typeof cssRaw === 'string' ? 'string' : 'other'}
        </div>
      </div>
    </div>
  )
}
