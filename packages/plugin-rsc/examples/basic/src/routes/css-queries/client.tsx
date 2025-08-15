'use client'

import cssUrl from './client-url.css?url'
import cssInline from './client-inline.css?inline'
import cssRaw from './client-raw.css?raw'
import React from 'react'

export function TestCssQueriesClient(props: {
  serverUrl: string
  serverInline: string
  serverRaw: string
}) {
  const [enabled, setEnabled] = React.useState(false)

  function urlWithHmr(href: string) {
    if (import.meta.hot) {
      href += '?t=' + Date.now()
    }
    return href
  }

  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>test-css-queries</button>
      {enabled && (
        <>
          <link rel="stylesheet" href={urlWithHmr(cssUrl)} />
          <style>{cssInline}</style>
          <style>{cssRaw}</style>
          <link rel="stylesheet" href={urlWithHmr(props.serverUrl)} />
          <style>{props.serverInline}</style>
          <style>{props.serverRaw}</style>
        </>
      )}
      <div className="test-css-url-client">test-css-url-client</div>
      <div className="test-css-inline-client">test-css-inline-client</div>
      <div className="test-css-raw-client">test-css-raw-client</div>
    </div>
  )
}
