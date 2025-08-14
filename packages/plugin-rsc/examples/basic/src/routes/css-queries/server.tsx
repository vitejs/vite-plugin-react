import cssUrl from './server-url.css?url'
import cssInline from './server-inline.css?inline'
import cssRaw from './server-raw.css?raw'
import { TestCssQueriesClient } from './client'

export function TestCssQueries() {
  return (
    <div>
      <div>
        <div data-testid="test-css-queries-server-url">
          CSS URL (server): {cssUrl}
        </div>
        <div data-testid="test-css-queries-server-inline">
          CSS Inline (server):{' '}
          {typeof cssInline === 'string' ? 'string' : 'other'}
        </div>
        <div data-testid="test-css-queries-server-raw">
          CSS Raw (server): {typeof cssRaw === 'string' ? 'string' : 'other'}
        </div>
        <div data-testid="test-css-queries-server-normal">
          Normal CSS import works (server)
        </div>
      </div>
      <TestCssQueriesClient />
    </div>
  )
}
