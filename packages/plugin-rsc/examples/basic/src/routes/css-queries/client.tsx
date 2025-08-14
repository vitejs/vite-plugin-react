'use client'

import cssUrl from './client-url.css?url'
import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'

export function TestCssQueriesClient() {
  return (
    <div>
      <div data-testid="test-css-queries-client-url">
        CSS URL (client): {cssUrl}
      </div>
      <div data-testid="test-css-queries-client-inline">
        CSS Inline (client):{' '}
        {typeof cssInline === 'string' ? 'string' : 'other'}
      </div>
      <div data-testid="test-css-queries-client-raw">
        CSS Raw (client): {typeof cssRaw === 'string' ? 'string' : 'other'}
      </div>
      <div data-testid="test-css-queries-client-normal">
        Normal CSS import works (client)
      </div>
    </div>
  )
}
