'use client'

import React from 'react'

export function TestUseCacheFlightReplayServerActionClient(props: {
  addToCart: (productId: string) => Promise<string>
  productId: string
  renderCount: number
}) {
  const [result, setResult] = React.useState('idle')

  return (
    <div data-testid="test-use-cache-flight-replay-server-action">
      <span data-testid="test-use-cache-flight-replay-server-action-cache">
        cached product card render count: {props.renderCount}
      </span>
      <button
        onClick={async () => {
          setResult(await props.addToCart(props.productId))
        }}
      >
        add cached product
      </button>
      <span data-testid="test-use-cache-flight-replay-server-action-result">
        {result}
      </span>
    </div>
  )
}
