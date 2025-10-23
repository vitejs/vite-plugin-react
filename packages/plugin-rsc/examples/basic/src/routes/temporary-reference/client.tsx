'use client'

import { action } from './action'
import React from 'react'

export function TestTemporaryReference() {
  const [result, setResult] = React.useState<React.ReactNode>('(none)')

  return (
    <div className="flex">
      <form
        action={async () => {
          setResult(await action(<span>[client]</span>))
        }}
      >
        <button>test-temporary-reference</button>
      </form>
      <div data-testid="temporary-reference">result: {result}</div>
    </div>
  )
}
