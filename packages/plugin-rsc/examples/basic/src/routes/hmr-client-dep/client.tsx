'use client'

import React from 'react'

import { ClientDep } from './client-dep'

export function TestHmrClientDep(props: { url: Pick<URL, 'search'> }) {
  const [count, setCount] = React.useState(0)
  return (
    <div>
      <span data-testid="test-hmr-client-dep">
        <button onClick={() => setCount((c) => c + 1)}>
          test-hmr-client-dep: {count}
        </button>
        <ClientDep />
      </span>{' '}
      <a href="?test-hmr-client-dep-re-render">
        re-render
        {props.url.search.includes('test-hmr-client-dep-re-render')
          ? ' [ok]'
          : ''}
      </a>
    </div>
  )
}
