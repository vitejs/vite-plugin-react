'use client'

import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'
import cssUrl from './client-url.css?url'
import React from 'react'

export function TestCssQueriesClient(props: {
  serverUrl: string
  serverInline: string
  serverRaw: string
}) {
  const [enabled, setEnabled] = React.useState(false)

  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>test-css-queries</button>
      <br />
      {enabled && (
        <>
          <link rel="stylesheet" href={cssUrl} />
          <style>{cssInline}</style>
          <style>{cssRaw}</style>
          <link rel="stylesheet" href={props.serverUrl} />
          <style>{props.serverInline}</style>
          <style>{props.serverRaw}</style>
        </>
      )}
      <span className="test-css-url-client">test-css-url-client</span>
      <span>|</span>
      <span className="test-css-inline-client">test-css-inline-client</span>
      <span>|</span>
      <span className="test-css-raw-client">test-css-raw-client</span>
    </div>
  )
}
