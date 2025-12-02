'use client'

import React from 'react'

import { clientDep } from './client-dep'

export function TestHmrClientDep2(props: { url: Pick<URL, 'search'> }) {
  const [count, setCount] = React.useState(0)
  return (
    <div>
      <span data-testid="test-hmr-client-dep2">
        <button onClick={() => setCount((c) => c + 1)}>
          test-hmr-client-dep2: {count}
        </button>
        {clientDep()}
      </span>{' '}
      <a href="?test-hmr-client-dep2-re-render">
        re-render
        {props.url.search.includes('test-hmr-client-dep2-re-render')
          ? ' [ok]'
          : ''}
      </a>
    </div>
  )
}
