'use client'

import cssUrl from './client-url.css?url'
import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'

export function TestCssQueriesClient() {
  return (
    <div>
      <div className="test-css-url-client">test-css-url-client: {cssUrl}</div>
      <div className="test-css-inline-client">
        test-css-inline-client:{' '}
        {typeof cssInline === 'string' ? 'string' : 'other'}
      </div>
      <div className="test-css-raw-client">
        test-css-raw-client: {typeof cssRaw === 'string' ? 'string' : 'other'}
      </div>
    </div>
  )
}
