'use client'

import { useState } from 'react'
import { cachedFromClient } from './action'

export function FileDirectiveFromClient() {
  const [requests, setRequests] = useState(0)
  const [result, setResult] = useState('none')

  async function call() {
    setRequests((value) => value + 1)
    setResult(await cachedFromClient('same'))
  }

  return (
    <div data-testid="file-directive-from-client">
      <button onClick={() => void call()}>call</button>
      <span>
        requests: {requests}; result: {result}
      </span>
    </div>
  )
}
