'use client'

import cssUrl from './client-url.css?url'
import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'
import React from 'react'

export function TestCssQueriesClient() {
  const [enabled, setEnabled] = React.useState(false)
  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>
        test-css-queries-client
      </button>
      {enabled && (
        <>
          <link rel="stylesheet" href={cssUrl} />
          <style>{cssInline}</style>
          <style>{cssRaw}</style>
        </>
      )}
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
